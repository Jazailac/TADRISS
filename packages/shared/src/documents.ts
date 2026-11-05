import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type Result } from './result';
import {
  documentMime,
  storageFileName,
  validateDocumentFile,
  type DocumentInput,
  type UpdateDocumentInput,
} from './schemas/documents';
import type { Audience } from './schemas/communication';

export type DocumentView = {
  id: string;
  uploaderId: string;
  uploaderName: string;
  audience: Audience;
  classId: string | null;
  className: string | null;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** ISO timestamp. */
  createdAt: string;
  archived: boolean;
};

// One literal (not concatenated) so the typed query builder can infer the embedded rows.
const COLUMNS =
  'id, uploader_id, audience, class_id, title, description, file_name, mime_type, size_bytes, created_at, deleted_at, class:classes!documents_class_id_institution_id_fkey(name)' as const;

const BUCKET = 'documents';

/** Documents the caller may see (RLS decides: their audience), newest first. */
export async function listDocuments(
  client: TadrissClient,
  opts: { archived?: boolean; limit?: number } = {},
): Promise<Result<DocumentView[]>> {
  let query = client
    .from('documents')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200);
  query = opts.archived ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));
  if (data.length === 0) return ok([]);

  const uploaderIds = [...new Set(data.map((d) => d.uploader_id))];
  const people = await client
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', uploaderIds);
  if (people.error) return err(toErrorCode(people.error));
  const names = new Map(people.data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));

  return ok(
    data.map((d) => ({
      id: d.id,
      uploaderId: d.uploader_id,
      uploaderName: names.get(d.uploader_id) ?? '',
      audience: d.audience as Audience,
      classId: d.class_id,
      className: d.class?.name ?? null,
      title: d.title,
      description: d.description,
      fileName: d.file_name,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
      createdAt: d.created_at,
      archived: d.deleted_at !== null,
    })),
  );
}

/**
 * Uploads the file, then records it. If the row cannot be created the object is removed again, so a
 * failure leaves nothing behind. The id is chosen here because the object path contains it.
 */
export async function uploadDocument(
  client: TadrissClient,
  institutionId: string,
  file: { body: Blob; name: string; size: number; type: string },
  input: DocumentInput,
): Promise<Result<{ id: string }>> {
  const invalid = validateDocumentFile(file);
  if (invalid === 'fileTooLarge') return err('file_too_large');
  if (invalid) return err('file_type');
  const mime = documentMime(file.name, file.type);
  if (!mime) return err('file_type');

  const id = crypto.randomUUID();
  const path = `${institutionId}/${id}/${storageFileName(file.name)}`;

  const up = await client.storage
    .from(BUCKET)
    .upload(path, file.body, { contentType: mime, upsert: false });
  if (up.error) {
    const status = (up.error as { statusCode?: string }).statusCode;
    if (status === '413') return err('file_too_large');
    if (status === '415') return err('file_type');
    return err(status === '403' ? 'forbidden' : 'unknown');
  }

  const { error } = await client.from('documents').insert({
    id,
    institution_id: institutionId,
    audience: input.audience.audience,
    class_id: input.audience.classId,
    title: input.title,
    description: input.description,
    storage_path: path,
    file_name: file.name.slice(0, 255),
    mime_type: mime,
    size_bytes: file.size,
  });
  if (error) {
    await client.storage.from(BUCKET).remove([path]);
    return err(toErrorCode(error));
  }
  return ok({ id });
}

export async function updateDocument(
  client: TadrissClient,
  input: UpdateDocumentInput,
): Promise<Result<null>> {
  const { error, count } = await client
    .from('documents')
    .update({ title: input.title, description: input.description }, { count: 'exact' })
    .eq('id', input.id);
  if (error) return err(toErrorCode(error));
  return count === 0 ? err('not_found') : ok(null);
}

/** Soft delete / restore. The file stays in Storage, so a restore loses nothing. */
export async function setDocumentArchived(
  client: TadrissClient,
  id: string,
  archived: boolean,
): Promise<Result<null>> {
  const { error, count } = await client
    .from('documents')
    .update({ deleted_at: archived ? new Date().toISOString() : null }, { count: 'exact' })
    .eq('id', id);
  if (error) return err(toErrorCode(error));
  return count === 0 ? err('not_found') : ok(null);
}

/**
 * A short-lived link to download the file. The row is read first with the caller's own rights, so
 * someone who cannot see the document gets `not_found` and never a signed URL.
 */
export async function getDocumentDownloadUrl(
  client: TadrissClient,
  id: string,
): Promise<Result<{ url: string }>> {
  const { data, error } = await client
    .from('documents')
    .select('storage_path, file_name')
    .eq('id', id)
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  if (!data) return err('not_found');
  const signed = await client.storage
    .from(BUCKET)
    .createSignedUrl(data.storage_path, 60, { download: data.file_name });
  if (signed.error) return err('not_found');
  return ok({ url: signed.data.signedUrl });
}

/** `1,5 Mo` / `1.5 MB`: binary units, one decimal from the megabyte up. */
export function formatBytes(
  bytes: number,
  units: { b: string; kb: string; mb: string },
  nf: Intl.NumberFormat,
): string {
  if (bytes < 1024) return `${nf.format(bytes)} ${units.b}`;
  if (bytes < 1024 * 1024) return `${nf.format(Math.round(bytes / 1024))} ${units.kb}`;
  return `${nf.format(Math.round((bytes / (1024 * 1024)) * 10) / 10)} ${units.mb}`;
}
