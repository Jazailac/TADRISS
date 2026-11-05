import { expect, test } from '@playwright/test';

test.describe('public demo', () => {
  test('one click signs in as each role', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Entrer dans la démo' }).nth(3).click();
    await page.waitForURL(/\/parent$/);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('the landing page links to it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Voir la démo' }).click();
    await expect(page).toHaveURL(/\/demo$/);
  });
});
