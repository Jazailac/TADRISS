import { expect, test, type Page } from '@playwright/test';

// The role home pages show real data from the seed (`pnpm dev:setup`), not placeholders.
const PASSWORD = 'Tadriss-dev-2026';

async function login(page: Page, email: string, path = '/login') {
  await page.goto(path);
  await page.getByLabel(/Adresse e-mail|البريد الإلكتروني|Email address/).fill(email);
  await page.getByLabel(/^(Mot de passe|كلمة المرور|Password)$/).fill(PASSWORD);
  await page
    .getByRole('button', { name: /^(Se connecter|تسجيل الدخول|Log in)$/ })
    .last()
    .click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

const main = (page: Page) => page.getByRole('main');

test.describe('dashboards', () => {
  test('the administration sees head-counts, finances and the latest announcements', async ({
    page,
  }) => {
    await login(page, 'direction@almanar.test');
    await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Bonjour, Salma');
    // Seeded: 30 students (one deactivated), 3 teachers, 3 classes.
    for (const label of ['Élèves', 'Enseignants', 'Classes', 'Appels du jour']) {
      await expect(main(page).getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(main(page).getByRole('heading', { name: 'Finances' })).toBeVisible();
    await expect(
      main(page)
        .getByText(/\d[\d.\s]*,\d{2}\s*MAD/)
        .first(),
    ).toBeVisible();
    await expect(
      main(page).getByRole('link', { name: /Rentrée scolaire 2026-2027/ }),
    ).toBeVisible();
    // A seeded school is not a new school.
    await expect(main(page).getByRole('heading', { name: 'Pour démarrer' })).toHaveCount(0);
    // Each tile leads to the page where it can be acted on.
    await main(page)
      .getByRole('link', { name: /Élèves/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/students$/);
  });

  test('a teacher sees today’s lessons, homework to follow and the news', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Bonjour, Ahmed');
    await expect(main(page).getByText('Cours aujourd’hui', { exact: true })).toBeVisible();
    await expect(
      main(page).getByRole('heading', { name: 'Mes cours d’aujourd’hui' }),
    ).toBeVisible();
    await expect(main(page).getByRole('heading', { name: 'Devoirs à suivre' })).toBeVisible();
    await expect(
      main(page).getByRole('link', { name: /Rentrée scolaire 2026-2027/ }),
    ).toBeVisible();
    // Teachers-only notices reach teachers.
    await expect(main(page).getByText('Réunion pédagogique vendredi')).toBeVisible();
  });

  test('a student sees attendance, average, work to do and what is owed', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Bonjour, Yasmine');
    await expect(main(page).getByText('Assiduité', { exact: true })).toBeVisible();
    await expect(
      main(page)
        .getByText(/^\d+ ?%$/)
        .first(),
    ).toBeVisible();
    await expect(main(page).getByText('Moyenne', { exact: true })).toBeVisible();
    await expect(main(page).getByText(/\/20$/).first()).toBeVisible();
    await expect(main(page).getByText('Reste à payer', { exact: true })).toBeVisible();
    await expect(main(page).getByRole('heading', { name: 'À faire' })).toBeVisible();
    await expect(main(page).getByRole('heading', { name: 'Dernières notes' })).toBeVisible();
    // The feed shows the pinned notice first, then the newest ones.
    await expect(
      main(page).getByRole('list', { name: 'Dernières annonces' }).getByRole('listitem').first(),
    ).toContainText('Rentrée scolaire 2026-2027');
  });

  test('a student with no class has an explained, empty home rather than an error', async ({
    page,
  }) => {
    await login(page, 'eleve31@almanar.test');
    await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
    await expect(main(page).getByText('Aucun cours aujourd’hui.')).toBeVisible();
  });

  test('Arabic home is right-to-left', async ({ page }) => {
    await login(page, 'eleve01@almanar.test', '/ar/login');
    await page.goto('/ar/student');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(main(page).getByText('الحضور', { exact: true })).toBeVisible();
  });
});
