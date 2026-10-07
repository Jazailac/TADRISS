import type { ErrorCode, ValidationKey } from '@tadriss/shared';

/** useActionState state shared by every dialog form. `done` flips on success so the dialog can close. */
export type FormState = {
  done?: boolean;
  error?: ErrorCode;
  fields?: Partial<Record<string, ValidationKey>>;
  /** Echoed (non-secret) values: React resets forms after an action, so the UI re-fills from here. */
  values?: Record<string, string>;
} | null;
