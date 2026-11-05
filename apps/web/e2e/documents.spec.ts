import { expect, test, type Page } from '@playwright/test';

// Documents against local Supabase + Storage + seed (`pnpm dev:setup` uploads the seed files).
// Widths run in parallel on shared accounts, so every title is unique.
const PASSWORD = 'Tadriss-dev-2026';
const ADMIN = 'admin2@almanar.test';
const REGLEMENT = '10000000-0000-4000-8000-000000000b01';
const CIRCULAIRE = '10000000-0000-4000-8000-000000000b03';

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

const unique = (tag: string, project: string) =>
  `${tag} ${project} ${Math.random().toString(36).slice(2, 7)}`;
const list = (page: Page) => page.getByRole('list', { name: 'Liste des documents' });
const row = (page: Page, title: string) =>
  list(page).getByRole('listitem').filter({ hasText: title });

test.describe('documents: reading', () => {
  test('a student sees what is addressed to them and can download it', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/documents');
    await expect(page.getByRole('heading', { level: 1, name: 'Documents' })).toBeVisible();
    await expect(row(page, 'Règlement intérieur')).toBeVisible();
    // Their class's sheet is there; the teachers-only circular is not.
    await expect(row(page, 'Fiche de révision : les fractions')).toBeVisible();
    await expect(page.getByText('Circulaire : évaluations du premier trimestre')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ajouter un document' })).toHaveCount(0);

    const res = await page.request.get(`/api/documents/${REGLEMENT}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-disposition']).toContain('reglement-interieur.txt');
    expect(await res.text()).toBe('Règlement intérieur\n');
  });

  test('a document that is not addressed to you cannot be downloaded either', async ({
    page,
    browser,
  }, testInfo) => {
    await login(page, 'eleve01@almanar.test');
    expect((await page.request.get(`/api/documents/${CIRCULAIRE}`)).status()).toBe(404);
    const teacher = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(teacher, 'prof1@almanar.test');
    expect((await teacher.request.get(`/api/documents/${CIRCULAIRE}`)).status()).toBe(200);
  });

  test('downloads need a session', async ({ request }) => {
    expect((await request.get(`/api/documents/${REGLEMENT}`)).status()).toBe(401);
    expect((await request.get('/api/documents/not-a-uuid')).status()).toBe(404);
  });

  test('guards: a student cannot open the admin or teacher pages', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/dashboard/documents');
    await expect(page).toHaveURL(/\/student$/);
    await page.goto('/teacher/documents');
    await expect(page).toHaveURL(/\/student$/);
  });

  test('Arabic page is right-to-left', async ({ page }) => {
    await login(page, 'eleve01@almanar.test', '/ar/login');
    await page.goto('/ar/student/documents');
    await expect(page.getByRole('heading', { level: 1, name: 'الوثائق' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('documents: publishing', () => {
  test('admin uploads → a student downloads it → rename → delete → restore', async ({
    page,
    browser,
  }, testInfo) => {
    const title = unique('Support', testInfo.project.name);
    await login(page, ADMIN);
    await page.goto('/dashboard/documents');

    await page.getByRole('button', { name: 'Ajouter un document' }).click();
    const form = page.getByRole('dialog');
    // Nothing chosen yet: the first problem is the file.
    await form.getByRole('button', { name: 'Envoyer le document' }).click();
    await expect(form.getByRole('alert').first()).toHaveText('Choisissez un fichier.');
    await form.getByLabel('Fichier').setInputFiles({
      name: 'Résumé du cours.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Contenu du résumé\n'),
    });
    // The file name is offered as the title; replace it.
    await expect(form.getByLabel('Titre')).toHaveValue('Résumé du cours');
    await form.getByLabel('Titre').fill(title);
    await form.getByLabel('Destinataires').selectOption({ label: 'Tous les élèves' });
    await form.getByLabel('Description (facultatif)').fill('Pour réviser.');
    await form.getByRole('button', { name: 'Envoyer le document' }).click();
    await expect(page.getByText('Document ajouté.')).toBeVisible();
    await expect(row(page, title)).toContainText('Tous les élèves');
    await expect(row(page, title)).toContainText('Pour réviser.');

    // A student downloads exactly what was uploaded, under its readable name.
    const student = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(student, 'eleve02@almanar.test');
    await student.goto('/student/documents');
    await expect(row(student, title)).toBeVisible();
    const href = await row(student, title)
      .getByRole('link', { name: /Télécharger/ })
      .getAttribute('href');
    const res = await student.request.get(href ?? '');
    expect(res.status()).toBe(200);
    expect(await res.text()).toBe('Contenu du résumé\n');
    expect(decodeURIComponent(res.headers()['content-disposition'] ?? '')).toContain(
      'Résumé du cours.txt',
    );

    // A teacher is not in the audience.
    const teacher = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(teacher, 'prof1@almanar.test');
    await teacher.goto('/teacher/documents');
    await expect(teacher.getByRole('heading', { level: 1, name: 'Documents' })).toBeVisible();
    await expect(teacher.getByText(title)).toHaveCount(0);
    expect((await teacher.request.get(href ?? '')).status()).toBe(404);

    // Rename, then delete: students lose it (and the download), the administration can restore it.
    await page.getByRole('button', { name: `Modifier ${title}` }).click();
    await page.getByRole('dialog').getByLabel('Titre').fill(`${title} (v2)`);
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Document mis à jour.')).toBeVisible();
    await expect(row(page, `${title} (v2)`)).toBeVisible();

    await page.getByRole('button', { name: `Supprimer ${title} (v2)` }).click();
    await expect(page.getByText('Document supprimé.')).toBeVisible();
    await expect(page.getByText(`${title} (v2)`)).toHaveCount(0);
    await student.goto('/student/documents');
    await expect(student.getByText(title)).toHaveCount(0);
    expect((await student.request.get(href ?? '')).status()).toBe(404);

    await page.goto('/dashboard/documents?view=deleted');
    await page.getByRole('button', { name: `Restaurer ${title} (v2)` }).click();
    await expect(page.getByText('Document restauré.')).toBeVisible();
    await student.goto('/student/documents');
    await expect(row(student, `${title} (v2)`)).toBeVisible();
  });

  test('a too-large or unsupported file is refused before anything is sent', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/documents');
    await page.getByRole('button', { name: 'Ajouter un document' }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Fichier').setInputFiles({
      name: 'enorme.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
    await expect(form.getByRole('alert')).toHaveText('Ce fichier dépasse 10 Mo.');
    await form.getByLabel('Fichier').setInputFiles({
      name: 'programme.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('MZ'),
    });
    await expect(form.getByRole('alert')).toHaveText('Ce type de fichier n’est pas accepté.');
  });

  test('a teacher shares only with their own classes, and only those students see it', async ({
    page,
    browser,
  }, testInfo) => {
    const title = unique('Cours', testInfo.project.name);
    await login(page, 'prof3@almanar.test');
    await page.goto('/teacher/documents');
    await page.getByRole('button', { name: 'Ajouter un document' }).click();
    const form = page.getByRole('dialog');
    const audience = form.getByLabel('Destinataires');
    await expect(audience.getByRole('option', { name: 'Tout l’établissement' })).toHaveCount(0);
    await expect(audience.getByRole('option', { name: /Classe\s*:\s*6ème A/ })).toHaveCount(0);
    const label = await audience.locator('option').first().innerText();
    await form.getByLabel('Fichier').setInputFiles({
      name: 'cours.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%%EOF\n'),
    });
    await form.getByLabel('Titre').fill(title);
    await form.getByRole('button', { name: 'Envoyer le document' }).click();
    await expect(page.getByText('Document ajouté.')).toBeVisible();
    await expect(row(page, title)).toContainText(label.replace(/^Classe\s*:\s*/, ''));

    const className = label.replace(/^Classe\s*:\s*/, '');
    const outsider = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(outsider, className === '6ème A' ? 'eleve09@almanar.test' : 'eleve01@almanar.test');
    await outsider.goto('/student/documents');
    await expect(outsider.getByRole('heading', { level: 1, name: 'Documents' })).toBeVisible();
    await expect(outsider.getByText(title)).toHaveCount(0);
  });
});
