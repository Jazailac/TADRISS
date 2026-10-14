import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type Result } from './result';
import type { Role } from './auth';
import type { MessageInput } from './schemas/communication';

export type Conversation = {
  otherId: string;
  firstName: string;
  lastName: string;
  role: Role | null;
  lastBody: string;
  /** ISO timestamp. */
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
};

/** One row per person the caller has written with: unread first, then most recent. */
export async function listConversations(client: TadrissClient): Promise<Result<Conversation[]>> {
  const { data, error } = await client.rpc('conversations');
  if (error) return err(toErrorCode(error));
  return ok(
    data.map((c) => ({
      otherId: c.other_id,
      // A left join: a contact RLS no longer shows us comes back null although typed as text.
      firstName: (c.first_name as string | null) ?? '',
      lastName: (c.last_name as string | null) ?? '',
      role: (c.role as Role | null) ?? null,
      lastBody: c.last_body,
      lastAt: c.last_at,
      lastFromMe: c.last_from_me,
      unread: c.unread_count,
    })),
  );
}

export type Message = {
  id: string;
  fromMe: boolean;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  readAt: string | null;
};

/** The thread with one person, oldest first. RLS means only the caller's own messages exist. */
export async function listThread(
  client: TadrissClient,
  myId: string,
  otherId: string,
  limit = 200,
): Promise<Result<Message[]>> {
  const { data, error } = await client
    .from('messages')
    .select('id, sender_id, body, created_at, read_at')
    .or(`sender_id.eq.${otherId},recipient_id.eq.${otherId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return err(toErrorCode(error));
  return ok(
    data
      .map((m) => ({
        id: m.id,
        fromMe: m.sender_id === myId,
        body: m.body,
        createdAt: m.created_at,
        readAt: m.read_at,
      }))
      .reverse(),
  );
}

export type Contact = { id: string; firstName: string; lastName: string; role: Role };

/**
 * People the caller may write to: whoever RLS lets them see (teachers: their students; students:
 * their teachers; everyone: the administration; the administration: everybody).
 */
export async function listContacts(
  client: TadrissClient,
  myId: string,
): Promise<Result<Contact[]>> {
  const { data, error } = await client
    .from('profiles')
    .select('id, first_name, last_name, role')
    .neq('id', myId)
    .eq('is_active', true)
    .in('role', ['institution_admin', 'teacher', 'student', 'parent'])
    .order('last_name')
    .order('first_name')
    .limit(1000);
  if (error) return err(toErrorCode(error));
  return ok(
    data.map((p) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      role: p.role as Role,
    })),
  );
}

/** One person the caller can see (RLS: their contacts), for a thread's header. */
export async function getContact(client: TadrissClient, id: string): Promise<Result<Contact>> {
  const { data, error } = await client
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('id', id)
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  if (!data) return err('not_found');
  return ok({
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    role: data.role as Role,
  });
}

export async function sendMessage(
  client: TadrissClient,
  institutionId: string,
  input: MessageInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('messages')
    .insert({ institution_id: institutionId, recipient_id: input.recipientId, body: input.body })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

/** Marks everything the other person sent as read (the server stamps the time). */
export async function markThreadRead(
  client: TadrissClient,
  otherId: string,
): Promise<Result<null>> {
  const { error } = await client
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', otherId)
    .is('read_at', null);
  return error ? err(toErrorCode(error)) : ok(null);
}
