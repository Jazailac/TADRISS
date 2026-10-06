import { expect, test } from '@playwright/test';

// Baselines are Linux-only (ADR 0008). Skip elsewhere so a mac run stays green.
test.skip(process.platform !== 'linux', 'visual baselines are generated on Linux');

const pages = [
  { name: 'home', fr: '/', ar: '/ar' },
  { name: 'login', fr: '/login', ar: '/ar/login' },
  { name: 'signup', fr: '/signup', ar: '/ar/signup' },
] as const;

for (const p of pages) {
  for (const locale of ['fr', 'ar'] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`${p.name} ${locale} ${scheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(p[locale]);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`${p.name}-${locale}-${scheme}.png`, {
          fullPage: true,
        });
      });
    }
  }
}
