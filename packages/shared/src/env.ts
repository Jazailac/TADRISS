import { z } from 'zod';

/** Public (browser-safe) Supabase config shared by both apps. */
export const supabasePublicEnv = z.object({
  url: z.url(),
  anonKey: z.string().min(20),
});

/**
 * Parses env with a zod schema and throws a single readable error listing every
 * problem. No fallbacks: a missing variable must stop the app at startup.
 */
export function parseEnv<S extends z.ZodType>(
  schema: S,
  values: unknown,
  label: string,
): z.infer<S> {
  const r = schema.safeParse(values);
  if (!r.success) {
    const lines = r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid ${label} environment:\n${lines}`);
  }
  return r.data;
}
