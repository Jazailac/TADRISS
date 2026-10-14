import { expect, test, type Page } from '@playwright/test';

// Parents (seed: parent01..05). parent02 guards two children, parent01 one.
const PASSWORD = 'Tadriss-dev-2026';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

const main = (page: Page) => page.getByRole('main');

test.describe('parent', () => {
  test('lands on /parent and sees a child’s day', async ({ page }) => {
    await login(page, 'parent02@almanar.test');
    await expect(page).toHaveURL(/\/parent$/);
    await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
    // Two children: a switcher is offered.
    await expect(main(page).getByRole('navigation', { name: /enfant/i })).toBeVisible();
  });

  test('every parent page opens and has no write controls on homework', async ({ page }) => {
    await login(page, 'parent02@almanar.test');
    for (const path of [
      '/parent/schedule',
      '/parent/attendance',
      '/parent/grades',
      '/parent/payments',
      '/parent/homework',
      '/parent/announcements',
      '/parent/messages',
      '/parent/documents',
    ]) {
      await page.goto(path);
      await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
    }
    await page.goto('/parent/homework');
    await expect(main(page).getByRole('checkbox')).toHaveCount(0);
    await expect(main(page).getByRole('button', { name: /terminé|fait/i })).toHaveCount(0);
  });

  test('a parent cannot open other areas', async ({ page }) => {
    await login(page, 'parent01@almanar.test');
    for (const path of ['/dashboard', '/teacher', '/student', '/admin']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/parent$/);
    }
  });

  test('a guardian’s child is chosen by ?child= only among their own', async ({ page }) => {
    await login(page, 'parent01@almanar.test');
    await page.goto('/parent?child=00000000-0000-4000-8000-000000000000');
    await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('the administration lists parents and their children', async ({ page }) => {
    await login(page, 'admin2@almanar.test');
    await page.goto('/dashboard/parents');
    await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
    await expect(main(page).getByText('parent02@almanar.test').first()).toBeVisible();
  });
});
