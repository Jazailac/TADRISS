import 'server-only';
import { parseEnv } from '@tadriss/shared';
import { z } from 'zod';

const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  /** Password of the seeded demo accounts. Unset = the public demo is off (the safe default). */
  DEMO_PASSWORD: z.string().min(8).optional(),
});

export const serverEnv = parseEnv(
  schema,
  {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DEMO_PASSWORD: process.env.DEMO_PASSWORD || undefined,
  },
  'web (server)',
);
