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
  'unknown',
] as const;
export type ErrorCode = (typeof errorCodes)[number];

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = <T = never>(error: ErrorCode): Result<T> => ({ ok: false, error });

/** Maps a PostgREST / Postgres error to a stable code. */
export function toErrorCode(e: { code?: string | null } | null | undefined): ErrorCode {
  switch (e?.code) {
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
