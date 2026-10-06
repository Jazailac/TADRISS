import { expect, test, type Page } from '@playwright/test';

const narrow = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;
const openMenuIfNarrow = async (page: Page) => {
  if (narrow(page)) await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
};

test.describe('marketing home', () => {
  test('French is the default locale, LTR', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('tenu avec soin');
  });

  test('Arabic renders RTL', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('Login and Sign up are reachable at every width', async ({ page }) => {
    await page.goto('/');
    if (narrow(page)) {
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
    const header = narrow(page) ? nav : page.locator('header');
    await expect(header.getByRole('link', { name: 'Se connecter' })).toBeVisible();
    await header.getByRole('link', { name: 'Créer un compte' }).click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test('no horizontal overflow', async ({ page }) => {
    for (const path of ['/', '/ar', '/login', '/signup', '/ar/signup']) {
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
    await openMenuIfNarrow(page);
    await page
      .getByRole('button', { name: 'Changer de thème' })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('locale switcher changes language', async ({ page }) => {
    await page.goto('/');
    await openMenuIfNarrow(page);
    const group = page.getByRole('group', { name: 'Langue' }).filter({ visible: true }).first();
    await expect(group.getByRole('button', { name: 'Français' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await group.getByRole('button', { name: 'العربية' }).click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('unknown paths show the localized 404', async ({ page }) => {
    const res = await page.goto('/does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
  });

  test('design reference is not served in production builds', async ({ page }) => {
    const res = await page.goto('/design');
    expect(res?.status()).toBe(404);
  });
});
