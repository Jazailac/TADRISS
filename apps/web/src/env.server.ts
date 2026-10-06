import 'server-only';
import { parseEnv } from '@tadriss/shared';
import { z } from 'zod';

const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

export const serverEnv = parseEnv(
  schema,
  { SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY },
  'web (server)',
);
