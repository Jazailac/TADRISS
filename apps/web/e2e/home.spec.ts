import { expect, test } from '@playwright/test';

test.describe('marketing home', () => {
  test('French is the default locale, LTR', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Arabic renders RTL', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('Login and Sign up are reachable at every width', async ({ page }, info) => {
    await page.goto('/');
    const isNarrow = (page.viewportSize()?.width ?? 0) < 768;
    if (isNarrow) {
      const toggle = page.getByRole('button', { name: 'Ouvrir le menu' });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await toggle.click();
      await expect(page.getByRole('button', { name: 'Fermer le menu' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    }
    const nav = page
      .getByRole('navigation', { name: 'Navigation principale' })
      .filter({ visible: true });
    await expect(nav.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    await nav.getByRole('link', { name: 'Créer un compte' }).click();
    await expect(page).toHaveURL(/\/signup$/);
    info.annotations.push({ type: 'width', description: String(page.viewportSize()?.width) });
  });

  test('no horizontal overflow', async ({ page }) => {
    for (const path of ['/', '/ar']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('theme toggle switches to dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    if ((page.viewportSize()?.width ?? 0) < 768)
      await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    await page.getByRole('button', { name: 'Changer de thème' }).filter({ visible: true }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('locale switcher changes language', async ({ page }) => {
    await page.goto('/');
    if ((page.viewportSize()?.width ?? 0) < 768)
      await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    await page.getByLabel('Langue').filter({ visible: true }).selectOption('ar');
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('unknown paths show the localized 404', async ({ page }) => {
    const res = await page.goto('/does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
  });
});
