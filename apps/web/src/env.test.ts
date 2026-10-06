import { afterEach, describe, expect, it, vi } from 'vitest';

const valid = {
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(40),
};

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('parses valid env', async () => {
    for (const [k, v] of Object.entries(valid)) vi.stubEnv(k, v);
    const { env } = await import('./env');
    expect(env.NEXT_PUBLIC_APP_URL).toBe(valid.NEXT_PUBLIC_APP_URL);
  });

  it('fails without NEXT_PUBLIC_APP_URL (no fallback)', async () => {
    for (const [k, v] of Object.entries(valid)) vi.stubEnv(k, v);
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined);
    await expect(import('./env')).rejects.toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
