import { expect, test, type Page } from '@playwright/test';

const STUDENT = '10000000-0000-4000-8000-000000000201';
const TEACHER = '10000000-0000-4000-8000-000000000101';
const main = (page: Page) => page.getByRole('main');

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill('Tadriss-dev-2026');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

test.describe('student file', () => {
  test('brings a student’s attendance, marks, money, classes and parents together', async ({
    page,
  }) => {
    await login(page, 'admin2@almanar.test');
    await page.goto(`/dashboard/students/${STUDENT}`);
    await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
    for (const label of ['Présence', 'Moyenne générale', 'Reste à payer', 'Classes']) {
      await expect(main(page).getByText(label, { exact: true })).toBeVisible();
    }
    for (const section of ['Dernières notes', 'Absences et retards', 'Factures', 'Ses classes']) {
      await expect(main(page).getByRole('heading', { level: 2, name: section })).toBeVisible();
    }
    await expect(main(page).getByRole('link', { name: 'Bulletin' })).toHaveAttribute(
      'href',
      `/report/${STUDENT}`,
    );
  });

  test('the student list opens the file', async ({ page }) => {
    await login(page, 'admin2@almanar.test');
    await page.goto('/dashboard/students');
    const row = main(page)
      .getByRole('list', { name: /élèves/i })
      .getByRole('listitem')
      .first();
    await row.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/dashboard\/students\/[0-9a-f-]{36}$/);
    await expect(main(page).getByRole('heading', { name: 'Ses classes' })).toBeVisible();
  });

  for (const [name, id] of [
    ['a malformed id', 'not-a-uuid'],
    ['an unknown id', '10000000-0000-4000-8000-00000000ffff'],
    ['someone who is not a student', TEACHER],
    ['a person from another school', '20000000-0000-4000-8000-0000000000a1'],
  ] as const) {
    test(`${name} gets the in-shell not-found page`, async ({ page }) => {
      await login(page, 'admin2@almanar.test');
      await page.goto(`/dashboard/students/${id}`);
      await expect(main(page).getByRole('heading', { name: 'Élève introuvable' })).toBeVisible();
    });
  }

  test('a student cannot open a file', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto(`/dashboard/students/${STUDENT}`);
    await expect(page).toHaveURL(/\/student$/);
  });
});

test.describe('people search in the page switcher', () => {
  test('finds a student by first and last name, in either order, and opens their file', async ({
    page,
  }) => {
    await login(page, 'admin2@almanar.test');
    await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog', { name: 'Aller à…' });
    const search = dialog.getByRole('textbox', { name: 'Aller à…' });
    await expect(dialog.getByText(/Tapez un nom/)).toBeVisible();

    await search.fill('Bennani Omar');
    const hit = dialog.getByRole('link', { name: /Omar Bennani/ });
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page).toHaveURL(/\/dashboard\/students\/[0-9a-f-]{36}$/);
    await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Omar Bennani');
    await expect(dialog).not.toBeVisible();
  });

  test('says so when nothing matches', async ({ page }) => {
    await login(page, 'admin2@almanar.test');
    await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog', { name: 'Aller à…' });
    await dialog.getByRole('textbox', { name: 'Aller à…' }).fill('zzzzzz');
    await expect(dialog.getByText('Aucune page ni personne pour cette recherche.')).toBeVisible();
    // Every word must match: a real first name with a wrong surname finds nobody.
    await dialog.getByRole('textbox', { name: 'Aller à…' }).fill('Omar zzzzzz');
    await expect(dialog.getByText('Aucune page ni personne pour cette recherche.')).toBeVisible();
    await expect(dialog.getByRole('link', { name: /Omar/ })).toHaveCount(0);
  });

  test('a teacher’s switcher stays pages-only', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog', { name: 'Aller à…' });
    await expect(dialog.getByText(/Tapez un nom/)).toHaveCount(0);
    await dialog.getByRole('textbox', { name: 'Aller à…' }).fill('Bennani');
    await expect(dialog.getByText('Aucune page disponible pour cette recherche.')).toBeVisible();
  });
});
