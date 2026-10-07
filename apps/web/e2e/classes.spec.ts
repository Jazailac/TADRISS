import { expect, test, type Page } from '@playwright/test';

// Classes & enrolment against local Supabase + seed (`pnpm dev:setup`).
const PASSWORD = 'Tadriss-dev-2026';
// Own admin so a global sign-out in another spec cannot end our session (see people.spec.ts).
const ADMIN = 'admin2@almanar.test';

async function login(page: Page, email: string, path = '/login') {
  await page.goto(path);
  await page.getByLabel(/Adresse e-mail|البريد الإلكتروني|Email address/).fill(email);
  await page.getByLabel(/^(Mot de passe|كلمة المرور|Password)$/).fill(PASSWORD);
  await page
    .getByRole('button', { name: /^(Se connecter|تسجيل الدخول|Log in)$/ })
    .last()
    .click();
  // Navigating before the sign-in action completes would abort it.
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

// The seed's school year. Pinned (not "current") so the suite does not rot when September comes.
const SEED_YEAR = '2026-2027';

/**
 * Each width works in its own school year: the seed year has only three unenrolled students,
 * and three parallel projects would otherwise fight over them.
 */
function yearFor(project: string): string {
  const now = new Date();
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const offset = project === 'w375' ? -1 : project === 'w768' ? 1 : 0;
  return `${start + offset}-${start + offset + 1}`;
}

/** Unique per test, width and run, so parallel projects never collide on class names. */
const uniqueName = (tag: string, project: string) =>
  `${tag}-${project}-${Math.random().toString(36).slice(2, 7)}`;

test.describe('classes: admin', () => {
  test('lists the seeded classes with teachers and seats', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto(`/dashboard/classes?year=${SEED_YEAR}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Classes' })).toBeVisible();
    const card = page.getByRole('link', { name: /6ème A/ }).first();
    await expect(card).toContainText('Ahmed Tazi');
    await expect(page.getByRole('link', { name: /3ème Sciences/ })).toContainText('Complète');
    await expect(page.getByRole('link', { name: /3ème Sciences/ })).toContainText('2 / 2');
  });

  test('search narrows the list and an empty result is explained', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto(`/dashboard/classes?year=${SEED_YEAR}&q=Sciences`);
    await expect(page.getByRole('link', { name: /3ème Sciences/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /6ème A/ })).toHaveCount(0);
    await page.goto(`/dashboard/classes?year=${SEED_YEAR}&q=zzzzzz`);
    await expect(page.getByRole('heading', { name: 'Aucune classe trouvée' })).toBeVisible();
  });

  test('another school sees no classes', async ({ page }) => {
    await login(page, 'direction@ibnrochd.test');
    await page.goto('/dashboard/classes');
    await expect(
      page.getByRole('heading', { name: 'Aucune classe pour cette année' }),
    ).toBeVisible();
    await expect(page.getByText('6ème A')).toHaveCount(0);
  });

  test('empty new-class form shows inline errors', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/classes');
    await page.getByRole('button', { name: 'Nouvelle classe' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Capacité (facultatif)').fill('999');
    await dialog.getByRole('button', { name: 'Créer la classe' }).click();
    await expect(dialog.getByRole('alert')).toHaveCount(2);
    await expect(dialog.getByText('Entre 1 et 200.')).toBeVisible();
    await expect(dialog.getByLabel('Nom de la classe')).toBeFocused();
  });

  test('create a class, assign a teacher, enrol students (capacity enforced), withdraw, archive', async ({
    page,
  }, testInfo) => {
    const name = uniqueName('Classe', testInfo.project.name);
    const year = yearFor(testInfo.project.name);
    await login(page, ADMIN);
    await page.goto(`/dashboard/classes?year=${year}`);

    // Create with a capacity of 2 and land on the new class.
    await page.getByRole('button', { name: 'Nouvelle classe' }).click();
    const create = page.getByRole('dialog');
    await create.getByLabel('Nom de la classe').fill(name);
    await create.getByLabel('Niveau (facultatif)').fill('Test');
    await create.getByLabel('Année scolaire').selectOption(year);
    await create.getByLabel('Capacité (facultatif)').fill('2');
    await create.getByRole('button', { name: 'Créer la classe' }).click();
    await expect(page).toHaveURL(/\/dashboard\/classes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByText('Aucun élève inscrit')).toBeVisible();
    await expect(page.getByText('Aucun enseignant affecté')).toBeVisible();

    // Duplicate names in the same school year are refused.
    await page.goto(`/dashboard/classes?year=${year}`);
    await page.getByRole('button', { name: 'Nouvelle classe' }).click();
    const dup = page.getByRole('dialog');
    await dup.getByLabel('Nom de la classe').fill(name);
    await dup.getByRole('button', { name: 'Créer la classe' }).click();
    await expect(dup.getByRole('alert')).toHaveText('Cet élément existe déjà.');
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: new RegExp(name) }).click();

    // Assign a teacher.
    await page.getByRole('button', { name: 'Gérer' }).click();
    const teachers = page.getByRole('dialog');
    await teachers.getByRole('checkbox', { name: /Fatima Alami/ }).check();
    await teachers.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Enseignants mis à jour.')).toBeVisible();
    await expect(page.getByRole('list').filter({ hasText: 'Fatima Alami' })).toBeVisible();

    // Enrol: three students are available but only two seats.
    await page.getByRole('button', { name: 'Ajouter des élèves' }).click();
    const enrol = page.getByRole('dialog');
    await expect(enrol.getByText('2 places restantes')).toBeVisible();
    const boxes = enrol.getByRole('checkbox');
    await expect(boxes.first()).toBeVisible();
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await expect(boxes.nth(2)).toBeDisabled();
    await enrol.getByRole('button', { name: 'Inscrire 2 élèves' }).click();
    await expect(page.getByText('2 élèves inscrits.')).toBeVisible();

    const roster = page.getByRole('list', { name: 'Liste des élèves inscrits' });
    await expect(roster.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Ajouter des élèves' })).toBeDisabled();
    await expect(page.getByText('Complète').first()).toBeVisible();

    // Withdraw one student, which frees a seat.
    await roster
      .getByRole('button', { name: /^Retirer / })
      .first()
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Retirer', exact: true }).click();
    await expect(page.getByText('Élève retiré de la classe.')).toBeVisible();
    await expect(roster.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Ajouter des élèves' })).toBeEnabled();

    // Edit the capacity.
    await page.getByRole('button', { name: 'Modifier', exact: true }).click();
    const edit = page.getByRole('dialog');
    await edit.getByLabel('Capacité (facultatif)').fill('5');
    await edit.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Classe mise à jour.')).toBeVisible();
    await expect(page.getByText('1 / 5')).toBeVisible();

    // Archive it: gone from the active list, present in the archive, and can be restored.
    await page.getByRole('button', { name: 'Archiver' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Archiver', exact: true }).click();
    await expect(page.getByText('Classe archivée.')).toBeVisible();
    await expect(page.getByText('Archivée').first()).toBeVisible();
    await page.goto(`/dashboard/classes?year=${year}`);
    await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
    await page.goto(`/dashboard/classes?year=${year}&archived=1`);
    await page.getByRole('link', { name: new RegExp(name) }).click();
    await page.getByRole('button', { name: 'Restaurer' }).click();
    await expect(page.getByText('Classe restaurée.')).toBeVisible();
  });

  test('a class page highlights Classes in the navigation, not the dashboard', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/classes/10000000-0000-4000-8000-000000000402');
    await expect(page.getByRole('heading', { level: 1, name: '6ème B' })).toBeVisible();
    // The sidebar is a drawer below 1024px; the breadcrumb is hidden below 768px.
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await expect(page.getByRole('link', { name: 'Classes', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(
        page.getByRole('link', { name: 'Tableau de bord', exact: true }),
      ).not.toHaveAttribute('aria-current', 'page');
    }
  });

  test('Arabic page is right-to-left', async ({ page }) => {
    await login(page, ADMIN, '/ar/login');
    await page.goto('/ar/dashboard/classes');
    await expect(page.getByRole('heading', { level: 1, name: 'الأقسام' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('a class that does not exist shows an in-app not-found page, not a crash', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/classes/00000000-0000-4000-8000-0000000009ff');
    await expect(page.getByRole('heading', { level: 1, name: 'Classe introuvable' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Toutes les classes' })).toBeVisible();
  });
});

test.describe('classes: teacher', () => {
  test('sees only the classes they teach, read-only', async ({ page }) => {
    await login(page, 'prof3@almanar.test');
    await page.goto(`/teacher/classes?year=${SEED_YEAR}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Classes' })).toBeVisible();
    // prof3 (Youssef Idrissi) teaches 5ème A and 3ème Sciences only.
    await expect(page.getByRole('link', { name: /5ème A/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /3ème Sciences/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /6ème A/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nouvelle classe' })).toHaveCount(0);

    await page.getByRole('link', { name: /3ème Sciences/ }).click();
    await expect(
      page.getByRole('list', { name: 'Liste des élèves inscrits' }).getByRole('listitem'),
    ).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Ajouter des élèves' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Archiver' })).toHaveCount(0);
  });

  test('cannot open a class they do not teach', async ({ page }) => {
    await login(page, 'prof3@almanar.test');
    // 6ème A is taught by prof1 only.
    await page.goto('/teacher/classes/10000000-0000-4000-8000-000000000401');
    await expect(page.getByRole('heading', { level: 1, name: 'Classe introuvable' })).toBeVisible();
    // Nothing about the class leaks: not its name, not its students.
    await expect(page.getByText('6ème A')).toHaveCount(0);
  });

  test('cannot reach the admin class pages', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/dashboard/classes');
    await expect(page).toHaveURL(/\/teacher$/);
  });
});
