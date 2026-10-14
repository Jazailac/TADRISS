import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'Tadriss-dev-2026';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

test.describe('report card', () => {
  test('a student opens their bulletin from the grades page', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/grades');
    await page.getByRole('link', { name: 'Bulletin' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Bulletin scolaire' })).toBeVisible();
    await expect(page.getByText('Moyenne générale')).toBeVisible();
  });

  test('a parent opens their child’s bulletin', async ({ page }) => {
    await login(page, 'parent01@almanar.test');
    await page.goto('/parent/grades');
    await page.getByRole('link', { name: 'Bulletin' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Bulletin scolaire' })).toBeVisible();
  });

  test('a student cannot open someone else’s bulletin', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/report/10000000-0000-4000-8000-000000000202');
    await expect(page.getByRole('heading', { name: 'Bulletin introuvable' })).toBeVisible();
  });
});
