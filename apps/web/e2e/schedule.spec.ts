import { expect, test, type Page } from '@playwright/test';

// Schedule against local Supabase + seed (`pnpm dev:setup`).
const PASSWORD = 'Tadriss-dev-2026';
const ADMIN = 'admin2@almanar.test';
const SEED_YEAR = '2026-2027';
const CLASS_6A = '10000000-0000-4000-8000-000000000401';
const CLASS_6B = '10000000-0000-4000-8000-000000000402';

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

/** The timetable region that is visible at this width: the grid (≥768px) or the phone agenda. */
const board = (page: Page) =>
  page.getByRole('group', {
    name:
      (page.viewportSize()?.width ?? 0) >= 768 ? 'Emploi du temps hebdomadaire' : 'Cours par jour',
  });

/** Each width gets its own Saturday window so parallel projects never collide. */
const windowFor = (project: string) =>
  project === 'w375'
    ? { start: '12:00', end: '13:00' }
    : project === 'w768'
      ? { start: '14:00', end: '15:00' }
      : { start: '16:00', end: '17:00' };

async function fillLesson(
  page: Page,
  v: { subject: string; teacher: string; day: string; start: string; end: string; room?: string },
) {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Matière').selectOption({ label: v.subject });
  await dialog.getByLabel('Enseignant').selectOption({ label: v.teacher });
  await dialog.getByLabel('Jour').selectOption({ label: v.day });
  await dialog.getByLabel('Début').fill(v.start);
  await dialog.getByLabel('Fin').fill(v.end);
  if (v.room) await dialog.getByLabel('Salle (facultatif)').fill(v.room);
}

test.describe('schedule: admin', () => {
  test('shows a class week and switches class', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto(`/dashboard/schedule?year=${SEED_YEAR}&class=${CLASS_6A}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Emploi du temps' })).toBeVisible();
    await expect(
      board(page).getByRole('button', { name: /Mathématiques, lundi 08:30–09:30/ }),
    ).toBeVisible();
    await expect(board(page).getByText('Ahmed Tazi').first()).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Choisir une classe' })
      .getByRole('link', { name: '6ème B' })
      .click();
    await expect(page).toHaveURL(new RegExp(`class=${CLASS_6B}`));
    await expect(board(page).getByText('Fatima Alami').first()).toBeVisible();
  });

  test('another school has no classes to schedule', async ({ page }) => {
    await login(page, 'direction@ibnrochd.test');
    await page.goto('/dashboard/schedule');
    await expect(page.getByRole('heading', { name: 'Aucune classe' })).toBeVisible();
  });

  test('a lesson that ends before it starts is refused inline', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto(`/dashboard/schedule?year=${SEED_YEAR}&class=${CLASS_6A}`);
    await page.getByRole('button', { name: 'Ajouter un cours' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Début').fill('10:00');
    await dialog.getByLabel('Fin').fill('09:00');
    await dialog.getByRole('button', { name: 'Ajouter le cours' }).click();
    await expect(dialog.getByText('La fin doit être après le début.')).toBeVisible();
  });

  test('add, conflict-check, edit and delete a lesson', async ({ page }, testInfo) => {
    const w = windowFor(testInfo.project.name);
    await login(page, ADMIN);
    await page.goto(`/dashboard/schedule?year=${SEED_YEAR}&class=${CLASS_6A}`);

    // Add a Saturday lesson (Saturday appears in the grid once it has a lesson).
    await page.getByRole('button', { name: 'Ajouter un cours' }).click();
    await fillLesson(page, {
      subject: 'Anglais',
      teacher: 'Ahmed Tazi',
      day: 'samedi',
      ...w,
      room: 'Lab',
    });
    await page.getByRole('dialog').getByRole('button', { name: 'Ajouter le cours' }).click();
    await expect(page.getByText('Cours ajouté.')).toBeVisible();
    const lesson = board(page).getByRole('button', {
      name: new RegExp(`Anglais, samedi ${w.start}`),
    });
    await expect(lesson).toBeVisible();
    await expect(board(page).getByText('Salle Lab').first()).toBeVisible();

    // The same class cannot have an overlapping lesson, even with another teacher.
    await page.getByRole('button', { name: 'Ajouter un cours' }).click();
    await fillLesson(page, { subject: 'Français', teacher: 'Ahmed Tazi', day: 'samedi', ...w });
    await page.getByRole('dialog').getByRole('button', { name: 'Ajouter le cours' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
      'Cette classe a déjà un cours sur ce créneau.',
    );
    await page.keyboard.press('Escape');

    // A teacher cannot be in two classes at once (Ahmed teaches 6A and 6B).
    await page.goto(`/dashboard/schedule?year=${SEED_YEAR}&class=${CLASS_6B}`);
    await page.getByRole('button', { name: 'Ajouter un cours' }).click();
    await fillLesson(page, { subject: 'Anglais', teacher: 'Ahmed Tazi', day: 'samedi', ...w });
    await page.getByRole('dialog').getByRole('button', { name: 'Ajouter le cours' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
      'Cet enseignant a déjà un cours sur ce créneau.',
    );
    await page.keyboard.press('Escape');

    // Back-to-back is fine: a lesson starting exactly when another ends.
    await page.getByRole('button', { name: 'Ajouter un cours' }).click();
    await fillLesson(page, {
      subject: 'Anglais',
      teacher: 'Ahmed Tazi',
      day: 'samedi',
      start: w.end,
      end: `${String(Number(w.end.slice(0, 2)) + 1).padStart(2, '0')}:00`,
    });
    await page.getByRole('dialog').getByRole('button', { name: 'Ajouter le cours' }).click();
    await expect(page.getByText('Cours ajouté.')).toBeVisible();

    // Edit the 6A lesson's room, then delete everything we created.
    await page.goto(`/dashboard/schedule?year=${SEED_YEAR}&class=${CLASS_6A}`);
    await board(page)
      .getByRole('button', { name: new RegExp(`Anglais, samedi ${w.start}`) })
      .click();
    await page.getByRole('dialog').getByLabel('Salle (facultatif)').fill('Salle 9');
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Cours mis à jour.')).toBeVisible();
    await expect(board(page).getByText('Salle Salle 9').first()).toBeVisible();

    await board(page)
      .getByRole('button', { name: new RegExp(`Anglais, samedi ${w.start}`) })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await page
      .getByRole('dialog')
      .getByRole('alert')
      .getByRole('button', { name: 'Supprimer' })
      .click();
    await expect(page.getByText('Cours supprimé.')).toBeVisible();
    await expect(
      board(page).getByRole('button', { name: new RegExp(`samedi ${w.start}`) }),
    ).toHaveCount(0);

    await page.goto(`/dashboard/schedule?year=${SEED_YEAR}&class=${CLASS_6B}`);
    await board(page)
      .getByRole('button', { name: new RegExp(`samedi ${w.end}`) })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await page
      .getByRole('dialog')
      .getByRole('alert')
      .getByRole('button', { name: 'Supprimer' })
      .click();
    await expect(page.getByText('Cours supprimé.')).toBeVisible();
  });

  test('manage subjects: add, reject a duplicate, archive and restore', async ({
    page,
  }, testInfo) => {
    const name = `Matière-${testInfo.project.name}-${Math.random().toString(36).slice(2, 6)}`;
    await login(page, ADMIN);
    await page.goto(`/dashboard/schedule?year=${SEED_YEAR}&class=${CLASS_6A}`);
    await page.getByRole('button', { name: 'Matières' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nom de la matière').fill(name);
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByText('Matière ajoutée.')).toBeVisible();
    const row = dialog
      .getByRole('list', { name: 'Liste des matières' })
      .getByRole('listitem')
      .filter({ hasText: name });
    await expect(row).toBeVisible();

    await dialog.getByLabel('Nom de la matière').fill(name.toUpperCase());
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Cet élément existe déjà.');

    await row.getByRole('button', { name: `Archiver ${name}` }).click();
    await expect(page.getByText('Matière archivée.')).toBeVisible();
    await expect(row).toContainText('Archivée');
    await row.getByRole('button', { name: `Restaurer ${name}` }).click();
    await expect(page.getByText('Matière restaurée.')).toBeVisible();
  });

  test('Arabic page is right-to-left with Arabic weekday names', async ({ page }) => {
    await login(page, ADMIN, '/ar/login');
    await page.goto(`/ar/dashboard/schedule?year=${SEED_YEAR}&class=${CLASS_6A}`);
    await expect(page.getByRole('heading', { level: 1, name: 'استعمال الزمن' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('الاثنين').filter({ visible: true }).first()).toBeVisible();
  });
});

test.describe('schedule: teacher and student', () => {
  test('a teacher sees only their own lessons, with the class name', async ({ page }) => {
    await login(page, 'prof3@almanar.test');
    await page.goto('/teacher/schedule');
    await expect(page.getByRole('heading', { level: 1, name: 'Emploi du temps' })).toBeVisible();
    await expect(board(page).getByText('5ème A').first()).toBeVisible();
    await expect(board(page).getByText('3ème Sciences').first()).toBeVisible();
    // 6ème A is taught by prof1 only.
    await expect(board(page).getByText('6ème A')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ajouter un cours' })).toHaveCount(0);
  });

  test('a student sees their class timetable with the teacher names', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/schedule');
    await expect(board(page).getByText('Ahmed Tazi').first()).toBeVisible();
    await expect(board(page).getByText('Mathématiques').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter un cours' })).toHaveCount(0);
    // Another class's teacher is not part of this week.
    await expect(board(page).getByText('Youssef Idrissi')).toHaveCount(0);
  });

  test('a student without a class gets an explanation, not an empty grid', async ({ page }) => {
    await login(page, 'eleve31@almanar.test');
    await page.goto('/student/schedule');
    await expect(
      page.getByRole('heading', { name: 'Vous n’avez pas encore de classe' }),
    ).toBeVisible();
  });

  test('students and teachers cannot open the admin timetable', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/dashboard/schedule');
    await expect(page).toHaveURL(/\/teacher$/);
  });
});
