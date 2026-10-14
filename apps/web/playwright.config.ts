import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const widths = [375, 768, 1280] as const;

/**
 * Functional specs run on every width. Visual specs (`*.visual.ts`) compare screenshots;
 * baselines are Linux-only and generated inside the Playwright Docker image
 * (`pnpm test:e2e:docker --update-snapshots`) so they match CI pixel-for-pixel.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.(spec|visual)\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    ...widths.map((width) => ({
      name: `w${width}`,
      // Module switches, plans and suspensions change what whole roles or schools see, so those specs
      // run alone, after everything else.
      testIgnore: /(settings-modules|platform)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width, height: width === 375 ? 812 : 900 },
        isMobile: width === 375,
        hasTouch: width === 375,
      },
    })),
    {
      name: 'modules',
      testMatch: /(settings-modules|platform)\.spec\.ts/,
      dependencies: widths.map((w) => `w${w}`),
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    // Always test the production build, never the dev server.
    command: `pnpm build && pnpm start --port ${PORT}`,
    // Redirects and emailed links are built from this URL, so it must be the port under test.
    env: { NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`, DEMO_PASSWORD: 'Tadriss-dev-2026' },
    url: `http://localhost:${PORT}`,
    // Never reuse: a stale server from an earlier build silently tests old code.
    reuseExistingServer: false,
    timeout: 600_000,
  },
});
