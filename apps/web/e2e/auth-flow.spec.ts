import { expect, test, type Page } from '@playwright/test';

// Real flows against local Supabase + seed (supabase/seed/README.md). Requires `pnpm dev:setup`.
const PASSWORD = 'Tadriss-dev-2026';
const wide = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

async function login(page: Page, email: string, path = '/login') {
  await page.goto(path);
  await page.getByLabel(/Adresse e-mail|البريد الإلكتروني|Email address/).fill(email);
  await page.getByLabel(/^(Mot de passe|كلمة المرور|Password)$/).fill(PASSWORD);
  await page
    .getByRole('button', { name: /^(Se connecter|تسجيل الدخول|Log in)$/ })
    .last()
    .click();
}

async function signOut(page: Page) {
  if (!wide(page)) await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
  await page.getByRole('button', { name: 'Se déconnecter' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test.describe('route protection', () => {
  test('signed-out users are sent to login with next', async ({ page }) => {
    await page.goto('/dashboard/students');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fstudents$/);
  });

  test('every role area is protected', async ({ page }) => {
    for (const area of ['/dashboard', '/teacher', '/student', '/admin', '/ar/teacher']) {
      await page.goto(area);
      await expect(page, area).toHaveURL(/\/login\?next=/);
    }
  });

  test('a next pointing off-site or to another role area is ignored', async ({ page }) => {
    await login(page, 'prof1@almanar.test', '/login?next=%2F%2Fevil.example');
    await expect(page).toHaveURL(/\/teacher$/);
  });
});

test.describe('sign-in by role', () => {
  test('admin lands on /dashboard with real profile data', async ({ page }) => {
    await login(page, 'direction@almanar.test', '/login?next=%2Fdashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonjour, Salma');
    if (wide(page)) await expect(page.getByText('Groupe scolaire Al Manar').first()).toBeVisible();
    // Built modules are links (a module not built yet would stay disabled, never a dead link).
    if (wide(page)) {
      await expect(
        page
          .getByRole('navigation', { name: 'Navigation de l’application' })
          .getByRole('link', { name: 'Élèves' }),
      ).toBeVisible();
    }
  });

  test('teacher lands on /teacher and cannot open the admin area', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonjour, Ahmed');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/teacher$/);
  });

  test('student lands on /student', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await expect(page).toHaveURL(/\/student$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonjour, Yasmine');
  });

  test('super_admin lands on /admin', async ({ page }) => {
    await login(page, 'ops@tadriss.test');
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('second tenant sees its own school only', async ({ page }) => {
    await login(page, 'direction@ibnrochd.test');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonjour, Karim');
    await expect(page.getByText('Groupe scolaire Al Manar')).toHaveCount(0);
  });

  test('Arabic sign-in keeps the locale and RTL', async ({ page }) => {
    await login(page, 'direction@almanar.test', '/ar/login');
    await expect(page).toHaveURL(/\/ar\/dashboard$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('مرحبًا، Salma');
  });

  test('wrong password shows a translated error and keeps the email', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill('direction@almanar.test');
    await page.getByLabel('Mot de passe', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: 'Se connecter' }).last().click();
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'E-mail ou mot de passe incorrect.',
    );
    await expect(page.getByLabel('Adresse e-mail')).toHaveValue('direction@almanar.test');
  });

  test('signed-in users are kept off the auth pages, and sign-out works', async ({ page }) => {
    await login(page, 'direction@almanar.test');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard$/);
    await signOut(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});

test.describe('self-serve onboarding', () => {
  test('a new school signs up and lands on its dashboard', async ({ page }, info) => {
    const email = `dir-${info.project.name}-${String(Date.now())}@e2e.test`;
    await page.goto('/signup');
    await page.getByLabel('Nom de l’établissement').fill('École Playwright');
    await page.getByLabel('Prénom').fill('Nadia');
    await page.getByLabel('Nom', { exact: true }).fill('Testeur');
    await page.getByLabel('Adresse e-mail professionnelle').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill('correct-horse-battery');
    await page.getByRole('button', { name: 'Créer mon espace' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonjour, Nadia');
    if (wide(page)) await expect(page.getByText('École Playwright').first()).toBeVisible();
    // A school with nobody yet gets a starting point, not a wall of zeros.
    await expect(page.getByRole('heading', { name: 'Pour démarrer' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Créez vos classes/ })).toBeVisible();

    // The same email cannot create a second school.
    await signOut(page);
    await page.goto('/signup');
    await page.getByLabel('Nom de l’établissement').fill('Autre école');
    await page.getByLabel('Prénom').fill('Nadia');
    await page.getByLabel('Nom', { exact: true }).fill('Testeur');
    await page.getByLabel('Adresse e-mail professionnelle').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill('correct-horse-battery');
    await page.getByRole('button', { name: 'Créer mon espace' }).click();
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'Un compte existe déjà avec cette adresse.',
    );
  });
});
