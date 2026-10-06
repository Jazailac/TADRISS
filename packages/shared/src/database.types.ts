// Placeholder until the first migration lands. Regenerate with `pnpm db:types`
// (requires `supabase start`); CI fails if the committed file drifts from the DB.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
