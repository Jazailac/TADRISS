import { z } from 'zod';
import { parseAudience } from './communication';
import type { ValidationKey } from './auth';

/** Mirrors the `documents` bucket (size and file types) and the `documents.size_bytes` check. */
export const documentLimits = { maxBytes: 10 * 1024 * 1024 } as const;

const mimeByExtension: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export const documentMimeTypes: readonly string[] = [...new Set(Object.values(mimeByExtension))];
/** For an `<input type="file" accept>`. */
export const documentAccept = Object.keys(mimeByExtension)
  .map((e) => `.${e}`)
  .join(',');

const extensionOf = (name: string) => /\.([A-Za-z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? '';

/**
 * The allowed MIME type for a file, or null. The browser's `type` is trusted only when it is on the
 * allow-list; otherwise (empty, or `application/octet-stream`) the extension decides.
 */
export function documentMime(name: string, type: string): string | null {
  if (documentMimeTypes.includes(type)) return type;
  if (type !== '' && type !== 'application/octet-stream') return null;
  return mimeByExtension[extensionOf(name)] ?? null;
}

/** Why a file cannot be uploaded, as an i18n key, or null when it can. */
export function validateDocumentFile(file: {
  name: string;
  size: number;
  type: string;
}): ValidationKey | null {
  if (file.size <= 0) return 'fileRequired';
  if (file.size > documentLimits.maxBytes) return 'fileTooLarge';
  return documentMime(file.name, file.type) ? null : 'fileType';
}

/**
 * A storage-safe object name: Storage rejects many characters (accents, spaces, slashes), so the
 * object key is an ASCII slug that keeps the extension. The readable name lives in `file_name`.
 */
export function storageFileName(name: string): string {
  const ext = extensionOf(name);
  const base = (ext ? name.slice(0, -(ext.length + 1)) : name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'document'}${ext ? `.${ext}` : ''}`;
}

const description = z
  .string()
  .trim()
  .max(1000, { error: 'tooLong' })
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const title = z.string().trim().min(1, { error: 'required' }).max(150, { error: 'tooLong' });

const audienceField = z
  .string()
  .refine((v) => parseAudience(v) !== null, { error: 'required' })
  .transform((v) => parseAudience(v) as NonNullable<ReturnType<typeof parseAudience>>);

/** The text fields of an upload (the file itself is validated with `validateDocumentFile`). */
export const documentInput = z.object({ audience: audienceField, title, description });
export type DocumentInput = z.infer<typeof documentInput>;

export const updateDocumentInput = z.object({
  id: z.uuid({ error: 'required' }),
  title,
  description,
});
export type UpdateDocumentInput = z.infer<typeof updateDocumentInput>;
