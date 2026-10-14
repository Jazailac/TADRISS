import { expect, test } from '@playwright/test';

test('the privacy policy is public in every language', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeVisible();
  await page.goto('/en/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
  await page.goto('/ar/privacy');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('the health endpoint answers without a session', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok' });
});
