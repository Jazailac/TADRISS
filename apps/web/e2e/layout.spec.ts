import { expect, test, type Page } from '@playwright/test';

// Phone layout: no page may be wider than the screen (a horizontal scrollbar on a phone means some
// row has a minimum width that stretches everything). Runs on the 375px project only.
const PASSWORD = 'Tadriss-dev-2026';
const SEED_YEAR = '2026-2027';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

const pages: Record<string, string[]> = {
  'admin2@almanar.test': [
    '/dashboard',
    '/dashboard/students',
    '/dashboard/teachers',
    '/dashboard/classes',
    `/dashboard/schedule?year=${SEED_YEAR}`,
    '/dashboard/attendance?date=2026-10-05',
    '/dashboard/grades',
  ],
  'prof1@almanar.test': [
    '/teacher',
    '/teacher/classes',
    '/teacher/schedule',
    '/teacher/attendance?date=2026-10-05',
    '/teacher/homework',
    '/teacher/grades',
  ],
  'eleve01@almanar.test': [
    '/student',
    '/student/schedule',
    '/student/attendance',
    '/student/homework',
    '/student/grades',
  ],
};

test.describe('no horizontal overflow on a phone', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 400, 'phone width only');

  for (const [email, paths] of Object.entries(pages)) {
    test(`${email.split('@')[0]}'s pages fit the screen`, async ({ page }) => {
      await login(page, email);
      for (const path of paths) {
        await page.goto(path);
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        const { client, scroll } = await page.evaluate(() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        expect(scroll, `${path} is ${scroll}px wide on a ${client}px screen`).toBeLessThanOrEqual(
          client + 1,
        );
      }
    });
  }
});
