import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type Result } from './result';
import type { Audience, AnnouncementInput, UpdateAnnouncementInput } from './schemas/communication';

export type AnnouncementView = {
  id: string;
  authorId: string;
  authorName: string;
  audience: Audience;
  classId: string | null;
  className: string | null;
  title: string;
  body: string;
  pinned: boolean;
  /** ISO timestamp. */
  createdAt: string;
  archived: boolean;
  /** Whether the CURRENT user has read it. */
  read: boolean;
};

// One literal (not concatenated) so the typed query builder can infer the embedded rows.
const COLUMNS =
  'id, author_id, audience, class_id, title, body, pinned, created_at, deleted_at, class:classes!announcements_class_id_institution_id_fkey(name)' as const;

type Row = {
  id: string;
  author_id: string;
  audience: string;
  class_id: string | null;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  deleted_at: string | null;
  class: unknown;
};

async function toViews(
  client: TadrissClient,
  userId: string,
  rows: Row[],
): Promise<Result<AnnouncementView[]>> {
  if (rows.length === 0) return ok([]);
  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const [people, reads] = await Promise.all([
    client.from('profiles').select('id, first_name, last_name').in('id', authorIds),
    client
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId)
      .in(
        'announcement_id',
        rows.map((r) => r.id),
      ),
  ]);
  if (people.error) return err(toErrorCode(people.error));
  if (reads.error) return err(toErrorCode(reads.error));
  const names = new Map(people.data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
  const seen = new Set(reads.data.map((r) => r.announcement_id));

  return ok(
    rows.map((r) => ({
      id: r.id,
      authorId: r.author_id,
      authorName: names.get(r.author_id) ?? '',
      audience: r.audience as Audience,
      classId: r.class_id,
      className: (r.class as { name: string } | null)?.name ?? null,
      title: r.title,
      body: r.body,
      pinned: r.pinned,
      createdAt: r.created_at,
      archived: r.deleted_at !== null,
      // Your own announcements are never "unread" for you.
      read: seen.has(r.id) || r.author_id === userId,
    })),
  );
}

/**
 * Announcements the caller may see (RLS decides: their audience), pinned first, newest first.
 * `archived` lists soft-deleted ones (an author's own, or all of them for the administration).
 */
export async function listAnnouncements(
  client: TadrissClient,
  userId: string,
  opts: { archived?: boolean; authorId?: string; limit?: number } = {},
): Promise<Result<AnnouncementView[]>> {
  let query = client
    .from('announcements')
    .select(COLUMNS)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200);
  query = opts.archived ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
  if (opts.authorId) query = query.eq('author_id', opts.authorId);
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));
  return toViews(client, userId, data);
}

export async function getAnnouncement(
  client: TadrissClient,
  userId: string,
  id: string,
): Promise<Result<AnnouncementView>> {
  const { data, error } = await client
    .from('announcements')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  if (!data) return err('not_found');
  const views = await toViews(client, userId, [data]);
  if (!views.ok) return views;
  const first = views.data[0];
  return first ? ok(first) : err('not_found');
}

export type AnnouncementReach = { readCount: number; audienceCount: number };

/** Readers so far / people addressed, for announcements the caller authored or administers. */
export async function getAnnouncementReach(
  client: TadrissClient,
  ids: string[],
): Promise<Result<Map<string, AnnouncementReach>>> {
  if (ids.length === 0) return ok(new Map());
  const { data, error } = await client.rpc('announcement_reach', { p_ids: ids });
  if (error) return err(toErrorCode(error));
  return ok(
    new Map(
      data.map((r) => [
        r.announcement_id,
        { readCount: r.read_count, audienceCount: r.audience_count },
      ]),
    ),
  );
}

export async function createAnnouncement(
  client: TadrissClient,
  institutionId: string,
  input: AnnouncementInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('announcements')
    .insert({
      institution_id: institutionId,
      audience: input.audience.audience,
      class_id: input.audience.classId,
      title: input.title,
      body: input.body,
    })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

export async function updateAnnouncement(
  client: TadrissClient,
  input: UpdateAnnouncementInput,
): Promise<Result<null>> {
  const { error, count } = await client
    .from('announcements')
    .update({ title: input.title, body: input.body }, { count: 'exact' })
    .eq('id', input.id);
  if (error) return err(toErrorCode(error));
  return count === 0 ? err('not_found') : ok(null);
}

/** Soft delete / restore. No `.select()`: the returned row would be invisible to some roles. */
export async function setAnnouncementArchived(
  client: TadrissClient,
  id: string,
  archived: boolean,
): Promise<Result<null>> {
  const { error, count } = await client
    .from('announcements')
    .update({ deleted_at: archived ? new Date().toISOString() : null }, { count: 'exact' })
    .eq('id', id);
  if (error) return err(toErrorCode(error));
  return count === 0 ? err('not_found') : ok(null);
}

export async function setAnnouncementPinned(
  client: TadrissClient,
  id: string,
  pinned: boolean,
): Promise<Result<null>> {
  const { error, count } = await client
    .from('announcements')
    .update({ pinned }, { count: 'exact' })
    .eq('id', id);
  if (error) return err(toErrorCode(error));
  return count === 0 ? err('not_found') : ok(null);
}

/** Marks announcements as read for the caller; ids they cannot see are ignored. */
export async function markAnnouncementsRead(
  client: TadrissClient,
  ids: string[],
): Promise<Result<{ marked: number }>> {
  if (ids.length === 0) return ok({ marked: 0 });
  const { data, error } = await client.rpc('mark_announcements_read', { p_ids: ids });
  if (error) return err(toErrorCode(error));
  return ok({ marked: data });
}

export type UnreadCounts = { announcements: number; messages: number };

/** The nav badges. Never throws: a failed count simply shows no badge. */
export async function getUnreadCounts(client: TadrissClient): Promise<UnreadCounts> {
  const { data } = await client.rpc('unread_counts');
  const row = data?.[0];
  return { announcements: row?.announcements ?? 0, messages: row?.messages ?? 0 };
}
