/** Return shape for server actions and data functions: never throw across the boundary. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: ErrorCode };

/**
 * Error codes are i18n keys under `errors.*` in every app's messages, so the UI can
 * translate them. Never return raw database messages to the client.
 */
export const errorCodes = [
  'validation',
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'invalid_credentials',
  'email_taken',
  'email_not_confirmed',
  'account_disabled',
  'class_full',
  'class_archived',
  'slot_class_busy',
  'slot_teacher_busy',
  'unknown',
] as const;
export type ErrorCode = (typeof errorCodes)[number];

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = <T = never>(error: ErrorCode): Result<T> => ({ ok: false, error });

/** Maps a PostgREST / Postgres error to a stable code. */
export function toErrorCode(
  e: { code?: string | null; message?: string | null } | null | undefined,
): ErrorCode {
  switch (e?.code) {
    case 'P0001': // raise exception 'class_full' / 'class_archived' from our triggers
      if (e.message === 'class_full') return 'class_full';
      if (e.message === 'class_archived') return 'class_archived';
      return 'unknown';
    case '23P01': // exclusion_violation: the timetable overlap constraints
      if (e.message?.includes('timetable_slots_class_no_overlap')) return 'slot_class_busy';
      if (e.message?.includes('timetable_slots_teacher_no_overlap')) return 'slot_teacher_busy';
      return 'conflict';
    case 'P0002': // no_data_found (e.g. the class is invisible or archived)
      return 'not_found';
    case '23505': // unique_violation
      return 'conflict';
    case '23503': // foreign_key_violation
    case '23514': // check_violation
    case '22P02': // invalid_text_representation
      return 'validation';
    case '42501': // insufficient_privilege (RLS)
      return 'forbidden';
    case 'PGRST116': // .single() found no row
      return 'not_found';
    case 'PGRST301': // JWT expired / invalid
      return 'unauthenticated';
    default:
      return 'unknown';
  }
}
