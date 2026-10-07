import { expect, test, type Page } from '@playwright/test';

// Homework against local Supabase + seed (`pnpm dev:setup`).
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

const uniqueTitle = (project: string) =>
  `Devoir ${project} ${Math.random().toString(36).slice(2, 7)}`;

test.describe('homework: teacher', () => {
  test('an empty form shows inline errors', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/homework');
    await page.getByRole('button', { name: 'Nouveau devoir' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Publier le devoir' }).click();
    await expect(dialog.getByRole('alert')).toHaveCount(1);
    await expect(dialog.getByLabel('Titre')).toBeFocused();
  });

  test('a teacher can only pick the classes they teach', async ({ page }) => {
    await login(page, 'prof3@almanar.test');
    await page.goto('/teacher/homework');
    await page.getByRole('button', { name: 'Nouveau devoir' }).click();
    const classes = page.getByRole('dialog').getByLabel('Classe');
    await expect(classes.getByRole('option', { name: '5ème A' })).toHaveCount(1);
    await expect(classes.getByRole('option', { name: '6ème A' })).toHaveCount(0);
  });

  test('seeded homework is listed under upcoming or past, whichever the date says', async ({
    page,
  }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/homework?view=past');
    const past = await page.getByText('Rédaction : mon quartier').count();
    await page.goto('/teacher/homework');
    const upcoming = await page.getByText('Rédaction : mon quartier').count();
    expect(past + upcoming).toBeGreaterThan(0);
  });

  test('publish → student ticks it → teacher sees progress → delete and restore', async ({
    page,
    browser,
  }, testInfo) => {
    const title = uniqueTitle(testInfo.project.name);
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/homework');

    // Publish for 6ème A, due far in the future so it is always "upcoming".
    await page.getByRole('button', { name: 'Nouveau devoir' }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Classe').selectOption({ label: '6ème A' });
    await form.getByLabel('Matière').selectOption({ label: 'Mathématiques' });
    await form.getByLabel('Titre').fill(title);
    await form
      .getByLabel('Consignes (facultatif)')
      .fill('Faire les exercices\nen détaillant les étapes.');
    await form.getByLabel('À rendre pour le').fill('2099-12-01');
    await form.getByRole('button', { name: 'Publier le devoir' }).click();
    await expect(page).toHaveURL(/\/teacher\/homework\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText('Faire les exercices')).toBeVisible();
    await expect(page.getByText('0/8 ont terminé').first()).toBeVisible();
    const detailUrl = page.url();

    // A student of 6ème A sees it and ticks it off.
    const student = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(student, 'eleve01@almanar.test');
    await student.goto('/student/homework');
    const todo = student.getByRole('region', { name: /À faire/ });
    await expect(todo.getByText(title)).toBeVisible();
    // Wait for the server round trip: the tick is optimistic, so a reload right away would abort it.
    const saved = student.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes('/student/homework'),
    );
    await student.getByRole('checkbox', { name: `Marquer « ${title} » comme fait` }).click();
    await saved;
    await expect(
      student.getByRole('checkbox', { name: `Marquer « ${title} » comme non fait` }),
    ).toBeChecked();
    await student.reload();
    await expect(student.getByRole('region', { name: /Terminés/ }).getByText(title)).toBeVisible();

    // A student of another class never sees it.
    const other = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(other, 'eleve09@almanar.test');
    await other.goto('/student/homework');
    await expect(other.getByText(title)).toHaveCount(0);

    // The teacher sees the progress, per student.
    await page.goto(detailUrl);
    await expect(page.getByText('1/8 ont terminé').first()).toBeVisible();
    await expect(
      page
        .getByRole('list', { name: 'Avancement des élèves' })
        .getByRole('listitem')
        .filter({ hasText: 'Terminé' }),
    ).toHaveCount(1);

    // Edit the title.
    await page.getByRole('button', { name: 'Modifier', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Titre').fill(`${title} (v2)`);
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Devoir mis à jour.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: `${title} (v2)` })).toBeVisible();

    // Delete: students lose it, the teacher can restore it.
    await page.getByRole('button', { name: 'Supprimer' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText('Devoir supprimé.')).toBeVisible();
    await expect(page.getByText('Ce devoir est supprimé')).toBeVisible();
    await student.reload();
    await expect(student.getByText(title)).toHaveCount(0);

    await page.goto('/teacher/homework?view=deleted');
    await expect(page.getByText(`${title} (v2)`)).toBeVisible();
    await page.getByText(`${title} (v2)`).click();
    await page.getByRole('button', { name: 'Restaurer' }).click();
    await expect(page.getByText('Devoir restauré.')).toBeVisible();
    await student.reload();
    await expect(student.getByText(`${title} (v2)`)).toBeVisible();
  });

  test('a teacher cannot open the admin or student homework', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/student/homework');
    await expect(page).toHaveURL(/\/teacher$/);
  });

  test('a homework that does not exist shows an in-app not-found page', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/teacher/homework/00000000-0000-4000-8000-0000000009ff');
    await expect(page.getByRole('heading', { level: 1, name: 'Devoir introuvable' })).toBeVisible();
  });

  test('Arabic page is right-to-left', async ({ page }) => {
    await login(page, 'prof1@almanar.test', '/ar/login');
    await page.goto('/ar/teacher/homework');
    await expect(page.getByRole('heading', { level: 1, name: 'الواجبات' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('homework: student', () => {
  test('sees their class’s homework in sections with teacher and due date', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/homework');
    await expect(page.getByRole('heading', { level: 1, name: 'Devoirs' })).toBeVisible();
    // The seed holds several 6ème A homework items; whichever sections they fall in today,
    // each shows its author and a tick box.
    await expect(page.getByText('Par Ahmed Tazi').first()).toBeVisible();
    await expect(page.getByRole('checkbox').first()).toBeVisible();
  });

  test('a student without a class has an explained empty state', async ({ page }) => {
    await login(page, 'eleve31@almanar.test');
    await page.goto('/student/homework');
    await expect(
      page.getByRole('heading', { name: 'Vous n’avez pas encore de classe' }),
    ).toBeVisible();
  });

  test('a student cannot reach the teacher homework pages', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/teacher/homework');
    await expect(page).toHaveURL(/\/student$/);
  });
});
