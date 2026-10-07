import { expect, test, type Page } from '@playwright/test';

// Exams and marks against local Supabase + seed (`pnpm dev:setup`).
const PASSWORD = 'Tadriss-dev-2026';
const ADMIN = 'admin2@almanar.test';
// Seeded exam ids (fixed): 701 = 6ème A Maths by prof1 (published), 705 = 6ème B Français by prof1.
const EXAM_701 = '10000000-0000-4000-8000-000000000701';
const EXAM_705 = '10000000-0000-4000-8000-000000000705';

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

const uniqueTitle = (project: string) =>
  `Examen ${project} ${Math.random().toString(36).slice(2, 7)}`;

test.describe('grades: teacher', () => {
  test('lists their exams with status, scale and progress', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/grades');
    await expect(page.getByRole('heading', { level: 1, name: 'Notes' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Contrôle 1 : les fractions/ })).toContainText(
      'Publié',
    );
    await expect(page.getByRole('link', { name: /TP : le cycle de l’eau/ })).toContainText(
      'Brouillon',
    );
    await expect(page.getByRole('link', { name: /Contrôle 1 : les fractions/ })).toContainText(
      'Coef. 2',
    );
    await expect(page.getByRole('link', { name: /Dictée n°1/ })).toContainText('sur 10');
  });

  test('semester filter and an empty result', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/grades?term=2');
    await expect(page.getByRole('heading', { name: 'Aucun examen' })).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Semestre' })
      .getByRole('link', { name: 'Tous' })
      .click();
    await expect(page.getByRole('link', { name: /Dictée n°1/ })).toBeVisible();
  });

  test('an empty exam form shows inline errors', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/grades');
    await page.getByRole('button', { name: 'Nouvel examen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Barème (sur)').fill('0');
    await dialog.getByLabel('Coefficient').fill('11');
    await dialog.getByRole('button', { name: 'Créer l’examen' }).click();
    await expect(dialog.getByText('Entre 1 et 100.')).toBeVisible();
    await expect(dialog.getByText('Entre 0,5 et 10, par pas de 0,5.')).toBeVisible();
    await expect(dialog.getByLabel('Intitulé')).toBeFocused();
  });

  test('enter marks (decimal comma, range check, absence), publish, and students see only their own', async ({
    page,
    browser,
  }, testInfo) => {
    const title = uniqueTitle(testInfo.project.name);
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/grades');

    // Create a draft exam out of 10, coefficient 2, for 6ème A.
    await page.getByRole('button', { name: 'Nouvel examen' }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Classe').selectOption({ label: '6ème A' });
    await form.getByLabel('Matière').selectOption({ label: 'Mathématiques' });
    await form.getByLabel('Intitulé').fill(title);
    await form.getByLabel('Barème (sur)').fill('10');
    await form.getByLabel('Coefficient').fill('2');
    await form.getByRole('button', { name: 'Créer l’examen' }).click();
    await expect(page).toHaveURL(/\/teacher\/grades\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText('Brouillon : les élèves ne voient ni cet examen')).toBeVisible();
    const examUrl = page.url();

    // Marks: Imane Alaoui 7,5 and Omar Bennani 11 (too high for /10), Mehdi Berrada absent.
    const imane = page.getByLabel('Note de Imane Alaoui');
    const omar = page.getByLabel('Note de Omar Bennani');
    await imane.fill('7,5');
    await omar.fill('11');
    await expect(page.getByRole('alert').filter({ hasText: 'Entre 0 et 10' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer les notes' })).toBeDisabled();
    await omar.fill('9');
    await page.getByLabel('Mehdi Berrada : absent').check();
    await page.getByLabel('Remarque pour Imane Alaoui').fill('Très bien');

    // Live statistics: 7,5/10 → 15 and 9/10 → 18, average 16,5; 2 graded of 8.
    await expect(page.getByText('16,5', { exact: true })).toBeVisible();
    await expect(page.getByText('2/8', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Enregistrer les notes' }).click();
    await expect(page.getByText('Notes enregistrées.')).toBeVisible();

    // Persisted, still shown with a comma.
    await page.reload();
    await expect(page.getByLabel('Note de Imane Alaoui')).toHaveValue('7,5');
    await expect(page.getByLabel('Note de Omar Bennani')).toHaveValue('9');
    await expect(page.getByLabel('Mehdi Berrada : absent')).toBeChecked();

    // A student cannot see a draft exam.
    const imaneStudent = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(imaneStudent, 'eleve05@almanar.test');
    await imaneStudent.goto('/student/grades');
    await expect(imaneStudent.getByText(title)).toHaveCount(0);

    // Publish: five students have no mark yet, so it asks first.
    await page.getByRole('button', { name: 'Publier les notes' }).click();
    await expect(
      page.getByRole('dialog').getByText('5 élèves n’ont pas encore de note.'),
    ).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Publier', exact: true }).click();
    await expect(page.getByText('Notes publiées.')).toBeVisible();
    await expect(page.getByText('Publié : chaque élève voit sa propre note.')).toBeVisible();

    // Imane sees her own mark, not Omar's.
    await imaneStudent.reload();
    // Scope to this exam's own row: three parallel runs each give Imane a 7,5 on their own exam.
    const imaneRow = imaneStudent.getByRole('listitem').filter({ hasText: title });
    await expect(imaneRow).toContainText('7,5/10');
    await expect(imaneRow).toContainText('Très bien');
    await expect(imaneStudent.getByText('Moyenne générale')).toBeVisible();

    // Mehdi was absent; Omar sees only his own 9.
    const omarStudent = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(omarStudent, 'eleve02@almanar.test');
    await omarStudent.goto('/student/grades');
    const omarRow = omarStudent.getByRole('listitem').filter({ hasText: title });
    await expect(omarRow).toContainText('9/10');
    await expect(omarRow).not.toContainText('7,5');
    const mehdiStudent = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(mehdiStudent, 'eleve06@almanar.test');
    await mehdiStudent.goto('/student/grades');
    await expect(mehdiStudent.getByText('Absent', { exact: true }).first()).toBeVisible();

    // A student of another class never sees it.
    const other = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(other, 'eleve09@almanar.test');
    await other.goto('/student/grades');
    await expect(other.getByText(title)).toHaveCount(0);

    // Unpublish hides it again; lowering the maximum below an existing mark is refused.
    await page.goto(examUrl);
    await page.getByRole('button', { name: 'Retirer la publication' }).click();
    await expect(page.getByText('Publication retirée.')).toBeVisible();
    await imaneStudent.reload();
    await expect(imaneStudent.getByText(title)).toHaveCount(0);

    await page.getByRole('button', { name: 'Modifier', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Barème (sur)').fill('5');
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
      'Une note dépasse le barème de l’examen.',
    );
    await page.keyboard.press('Escape');

    // Delete and restore.
    await page.getByRole('button', { name: 'Supprimer' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText('Examen supprimé.')).toBeVisible();
    await page.goto('/teacher/grades?view=deleted');
    await page.getByText(title).click();
    await page.getByRole('button', { name: 'Restaurer' }).click();
    await expect(page.getByText('Examen restauré.')).toBeVisible();
  });

  test('Enter moves to the next student’s mark', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto(`/teacher/grades/${EXAM_701}`);
    // The key handler exists only once React has hydrated, so retry until it is attached.
    await expect(async () => {
      await page.getByLabel('Note de Imane Alaoui').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByLabel('Note de Omar Bennani')).toBeFocused({ timeout: 500 });
    }).toPass();
  });

  test('a co-teacher of the class can open the exam but not enter marks', async ({ page }) => {
    await login(page, 'prof2@almanar.test');
    await page.goto(`/teacher/grades/${EXAM_705}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Rédaction' })).toBeVisible();
    await expect(
      page.getByText('Seul l’enseignant qui a créé cet examen peut saisir les notes.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer les notes' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Publier les notes' })).toHaveCount(0);
  });

  test('a teacher who does not teach the class cannot open its exam', async ({ page }) => {
    await login(page, 'prof3@almanar.test');
    await page.goto(`/teacher/grades/${EXAM_701}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Examen introuvable' })).toBeVisible();
  });

  test('Arabic page is right-to-left', async ({ page }) => {
    await login(page, 'prof1@almanar.test', '/ar/login');
    await page.goto('/ar/teacher/grades');
    await expect(page.getByRole('heading', { level: 1, name: 'النقط' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('grades: admin', () => {
  test('sees every exam with the school average, read-only', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/grades');
    await expect(page.getByRole('heading', { level: 1, name: 'Notes' })).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Liste des examens' }).getByRole('listitem').first(),
    ).toBeVisible();
    await expect(page.getByText('Moyenne des examens publiés')).toBeVisible();
    // Filtering by class narrows the list.
    await page.getByLabel('Classe').selectOption({ label: '3ème Sciences' });
    await page.getByRole('button', { name: 'Filtrer' }).click();
    await expect(page.getByRole('link', { name: /Brevet blanc/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dictée n°1/ })).toHaveCount(0);

    await page.getByRole('link', { name: /Brevet blanc/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Brevet blanc' })).toBeVisible();
    await expect(
      page.getByText('Seul l’enseignant qui a créé cet examen peut saisir les notes.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer les notes' })).toHaveCount(0);
  });

  test('another school sees no exams', async ({ page }) => {
    await login(page, 'direction@ibnrochd.test');
    await page.goto('/dashboard/grades');
    await expect(page.getByRole('heading', { name: 'Aucun examen' })).toBeVisible();
  });

  test('an admin cannot open the teacher grade pages', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/teacher/grades');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('grades: student', () => {
  test('sees only published marks, with subject averages and a mention', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/grades');
    await expect(page.getByRole('heading', { level: 1, name: 'Notes' })).toBeVisible();
    await expect(page.getByText('Contrôle 1 : les fractions')).toBeVisible();
    await expect(page.getByText('Dictée n°1')).toBeVisible();
    // The draft exam is invisible to students.
    await expect(page.getByText('TP : le cycle de l’eau')).toHaveCount(0);
    await expect(page.getByText('Moyenne générale')).toBeVisible();
    await expect(
      page.getByText(/^(Très bien|Bien|Assez bien|Passable|Insuffisant)$/).first(),
    ).toBeVisible();
    await expect(page.getByText('Moyenne en Mathématiques')).toBeVisible();
  });

  test('a student only sees their own class’s exams', async ({ page }) => {
    await login(page, 'eleve09@almanar.test');
    await page.goto('/student/grades');
    await expect(page.getByText('Contrôle 1 : la géométrie')).toBeVisible();
    await expect(page.getByText('Contrôle 1 : les fractions')).toHaveCount(0);
  });

  test('a student without a class has an explained empty state', async ({ page }) => {
    await login(page, 'eleve31@almanar.test');
    await page.goto('/student/grades');
    await expect(
      page.getByRole('heading', { name: 'Vous n’avez pas encore de classe' }),
    ).toBeVisible();
  });

  test('a student cannot reach the teacher grade pages', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/teacher/grades');
    await expect(page).toHaveURL(/\/student$/);
  });
});
