// Validate every env var once at server startup so a misconfigured deploy fails fast.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./env');
    await import('./env.server');
  }
}
