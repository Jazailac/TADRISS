import { expect, test, type Page } from '@playwright/test';

// Attendance against local Supabase + seed (`pnpm dev:setup`).
const PASSWORD = 'Tadriss-dev-2026';
const ADMIN = 'admin2@almanar.test';
// Seeded roll calls cover Mondays 14 Sep – 5 Oct 2026 (fixed dates, so the seed stays deterministic).
const SEEDED_MONDAY = '2026-10-05';

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

/** The most recent Monday on or before today, in the school's calendar (always within 14 days). */
function lastMonday(): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y = 0, m = 0, d = 0] = today.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return new Date(Date.UTC(y, m - 1, d - ((dow + 6) % 7))).toISOString().slice(0, 10);
}

const lessons = (page: Page) =>
  page.getByRole('list', { name: 'Cours de la journée' }).getByRole('listitem');
const index = (project: string) => (project === 'w375' ? 0 : project === 'w768' ? 1 : 2);

test.describe('attendance: teacher', () => {
  test('lists the teacher’s lessons of a day with their roll-call status', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto(`/teacher/attendance?date=${SEEDED_MONDAY}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Présences' })).toBeVisible();
    // prof1 teaches three lessons on Mondays; the seed holds a roll call for each.
    await expect(lessons(page)).toHaveCount(3);
    await expect(lessons(page).first()).toContainText('Mathématiques');
    await expect(lessons(page).first()).toContainText('Appel fait');
    await expect(
      lessons(page).first().getByRole('link', { name: 'Modifier l’appel' }),
    ).toBeVisible();
  });

  test('a future day shows upcoming lessons and no roll-call button', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/attendance?date=2099-01-05');
    await expect(lessons(page).first()).toContainText('À venir');
    await expect(page.getByRole('link', { name: /l’appel$/ })).toHaveCount(0);
  });

  test('Sunday has no school', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/attendance?date=2026-10-11');
    await expect(page.getByText('Pas de cours le dimanche.')).toBeVisible();
  });

  test('take or correct a roll call: mark a student absent with a note, and it persists', async ({
    page,
  }, testInfo) => {
    const note = `Certificat ${testInfo.project.name}`;
    await login(page, 'prof1@almanar.test');
    await page.goto(`/teacher/attendance?date=${lastMonday()}`);
    await lessons(page)
      .nth(index(testInfo.project.name))
      .getByRole('link', { name: /l’appel$/ })
      .click();
    await expect(page).toHaveURL(/\/teacher\/attendance\/[0-9a-f-]{36}\?date=/);

    const first = page.getByRole('radiogroup').first();
    await first.getByRole('radio', { name: 'Absent' }).click();
    await page
      .getByRole('textbox', { name: /^Note pour / })
      .first()
      .fill(note);
    await page.getByRole('button', { name: 'Enregistrer l’appel' }).click();
    await expect(page.getByText('Appel enregistré.')).toBeVisible();

    // After a reload the same status and note come back from the database.
    await page.reload();
    await expect(
      page.getByRole('radiogroup').first().getByRole('radio', { name: 'Absent' }),
    ).toBeChecked();
    await expect(page.getByRole('textbox', { name: /^Note pour / }).first()).toHaveValue(note);

    // "Everyone present" resets the roll call; saving it corrects the record.
    await page.getByRole('button', { name: 'Tout le monde présent' }).click();
    await expect(
      page.getByRole('radiogroup').first().getByRole('radio', { name: 'Présent' }),
    ).toBeChecked();
    await page.getByRole('button', { name: 'Enregistrer l’appel' }).click();
    await expect(page.getByText('Appel enregistré.')).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('radiogroup').first().getByRole('radio', { name: 'Présent' }),
    ).toBeChecked();
  });

  test('the save button is disabled until something changes on an existing roll call', async ({
    page,
  }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto(`/teacher/attendance?date=${SEEDED_MONDAY}`);
    await lessons(page)
      .first()
      .getByRole('link', { name: /l’appel$/ })
      .click();
    await expect(page.getByRole('button', { name: 'Enregistrer l’appel' })).toBeDisabled();
    await page.getByRole('radiogroup').first().getByRole('radio', { name: 'En retard' }).click();
    await expect(page.getByRole('button', { name: 'Enregistrer l’appel' })).toBeEnabled();
    await expect(page.getByText('Modifications non enregistrées')).toBeVisible();
  });

  test('a lesson the teacher does not teach is not found (and leaks nothing)', async ({ page }) => {
    await login(page, 'prof3@almanar.test');
    await page.goto(
      `/teacher/attendance/00000000-0000-4000-8000-0000000009ff?date=${SEEDED_MONDAY}`,
    );
    await expect(page.getByRole('heading', { level: 1, name: 'Cours introuvable' })).toBeVisible();
  });

  test('a teacher cannot open the admin attendance pages', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/dashboard/attendance');
    await expect(page).toHaveURL(/\/teacher$/);
  });
});

test.describe('attendance: admin', () => {
  test('shows every lesson of the day and attendance rates by class', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto(`/dashboard/attendance?date=${SEEDED_MONDAY}`);
    await expect(lessons(page)).toHaveCount(7);
    await expect(lessons(page).filter({ hasText: 'Appel fait' })).toHaveCount(7);
    const summary = page.getByRole('heading', { name: 'Assiduité par classe' });
    await expect(summary).toBeVisible();
    await expect(page.getByText(/^\d{2,3}\s?%$/).first()).toBeVisible();
    await expect(page.getByText('6ème B').last()).toBeVisible();
  });

  test('date navigation moves a day at a time', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto(`/dashboard/attendance?date=${SEEDED_MONDAY}`);
    await page.getByRole('link', { name: 'Jour suivant' }).click();
    await expect(page).toHaveURL(/date=2026-10-06/);
    await expect(page).toHaveURL(/date=2026-10-06/);
    await page.getByRole('link', { name: 'Jour précédent' }).click();
    await expect(page).toHaveURL(/date=2026-10-05/);
    await page.getByRole('link', { name: 'Jour précédent' }).click();
    await expect(page).toHaveURL(/date=2026-10-04/);
    await expect(page.getByText('Pas de cours le dimanche.')).toBeVisible();
  });

  test('take an old roll call (no 14-day limit for the administration)', async ({
    page,
  }, testInfo) => {
    // A Monday before the seeded range, one per width, so parallel runs never share a roll call.
    const date =
      ['2026-09-07', '2026-08-31', '2026-08-24'][index(testInfo.project.name)] ?? '2026-09-07';
    await login(page, ADMIN);
    await page.goto(`/dashboard/attendance?date=${date}`);
    const lesson = lessons(page).filter({ hasText: '3ème Sciences' });
    await expect(lesson).toContainText('À faire');
    await lesson.getByRole('link', { name: 'Faire l’appel' }).click();

    await page.getByRole('radiogroup').first().getByRole('radio', { name: 'En retard' }).click();
    await page.getByRole('button', { name: 'Enregistrer l’appel' }).click();
    await expect(page.getByText('Appel enregistré.')).toBeVisible();

    await page.goto(`/dashboard/attendance?date=${date}`);
    await expect(lessons(page).filter({ hasText: '3ème Sciences' })).toContainText('Appel fait');
    await expect(lessons(page).filter({ hasText: '3ème Sciences' })).toContainText('1 En retard');
  });

  test('another school sees no lessons', async ({ page }) => {
    await login(page, 'direction@ibnrochd.test');
    await page.goto(`/dashboard/attendance?date=${SEEDED_MONDAY}`);
    await expect(page.getByRole('heading', { name: 'Aucun cours ce jour-là' })).toBeVisible();
  });

  test('Arabic page is right-to-left', async ({ page }) => {
    await login(page, ADMIN, '/ar/login');
    await page.goto(`/ar/dashboard/attendance?date=${SEEDED_MONDAY}`);
    await expect(page.getByRole('heading', { level: 1, name: 'الحضور' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('attendance: student', () => {
  test('sees their own rate, absences and history', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/attendance');
    await expect(page.getByRole('heading', { level: 1, name: 'Présences' })).toBeVisible();
    await expect(page.getByText('Assiduité', { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d{2,3}\s?%$/).first()).toBeVisible();
    const history = page
      .getByRole('list', { name: 'Historique de présence' })
      .getByRole('listitem');
    await expect(history.first()).toBeVisible();
    // Only their own marks: a student never sees an attendance form.
    await expect(page.getByRole('radiogroup')).toHaveCount(0);
  });

  test('a student without a class has an empty, explained history', async ({ page }) => {
    await login(page, 'eleve31@almanar.test');
    await page.goto('/student/attendance');
    await expect(page.getByRole('heading', { name: 'Aucun appel enregistré' })).toBeVisible();
  });

  test('a student cannot open teacher or admin attendance', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/teacher/attendance');
    await expect(page).toHaveURL(/\/student$/);
    await page.goto('/dashboard/attendance');
    await expect(page).toHaveURL(/\/student$/);
  });
});
