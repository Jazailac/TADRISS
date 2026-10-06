import { parseEnv } from '@tadriss/shared';
import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_APP_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

// Referenced literally so Expo inlines them at bundle time.
export const env = parseEnv(
  schema,
  {
    EXPO_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  'mobile',
);
