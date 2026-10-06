import { expect, test } from '@playwright/test';

// Baselines are Linux-only (see playwright.config.ts). Skip elsewhere so a mac run stays green.
test.skip(process.platform !== 'linux', 'visual baselines are generated on Linux');

for (const locale of ['fr', 'ar'] as const) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`home ${locale} ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(locale === 'fr' ? '/' : `/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`home-${locale}-${scheme}.png`, { fullPage: true });
    });
  }
}
