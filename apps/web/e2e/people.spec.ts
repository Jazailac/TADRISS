import { expect, test, type Page } from '@playwright/test';

// Users & invitations against local Supabase + seed + Mailpit (`pnpm dev:setup`).
const PASSWORD = 'Tadriss-dev-2026';
// Own admin account: sign-out is global, so sharing `direction@` with other specs would log us out.
const ADMIN = 'admin2@almanar.test';
const NEW_PASSWORD = 'Nouveau-mdp-2026';
const MAIL = 'http://127.0.0.1:54324';

async function login(
  page: Page,
  email: string,
  password = PASSWORD,
  path = '/login',
  { expectSuccess = true } = {},
) {
  await page.goto(path);
  await page.getByLabel(/Adresse e-mail|البريد الإلكتروني|Email address/).fill(email);
  await page.getByLabel(/^(Mot de passe|كلمة المرور|Password)$/).fill(password);
  await page
    .getByRole('button', { name: /^(Se connecter|تسجيل الدخول|Log in)$/ })
    .last()
    .click();
  // Navigating before the sign-in action completes would abort it.
  if (expectSuccess) {
    await page
      .waitForURL((u) => !/\/login$/.test(u.pathname), { timeout: 10_000 })
      .catch(async (e: unknown) => {
        const shown = await page.locator('form').innerText();
        throw new Error(`sign-in did not complete for ${email}. Form says: ${shown}`, { cause: e });
      });
  }
}

/** Unique per test and width, so parallel projects never invite the same address. */
const uniqueEmail = (tag: string, project: string) =>
  `${tag}-${project}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@almanar.test`;

async function inviteVia(page: Page, role: 'students' | 'teachers', first: string, email: string) {
  await page.goto(`/dashboard/${role}`);
  await page.getByRole('button', { name: /^Inviter un/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Prénom').fill(first);
  await dialog.getByLabel('Nom', { exact: true }).fill('Testeur');
  await dialog.getByLabel('Adresse e-mail').fill(email);
  await dialog.getByRole('button', { name: 'Envoyer l’invitation' }).click();
  await expect(page.getByText(`Invitation envoyée à ${email}.`)).toBeVisible();
}

/** Reads the invite link out of the email Supabase Auth sent to Mailpit. */
async function inviteLink(email: string): Promise<string> {
  let html = '';
  await expect
    .poll(
      async () => {
        const list = (await (await fetch(`${MAIL}/api/v1/search?query=to:${email}`)).json()) as {
          messages: { ID: string }[];
        };
        const id = list.messages[0]?.ID;
        if (!id) return '';
        html = ((await (await fetch(`${MAIL}/api/v1/message/${id}`)).json()) as { HTML: string })
          .HTML;
        return html;
      },
      { message: `invite email for ${email}`, timeout: 15_000 },
    )
    .not.toBe('');
  const href = /href="([^"]*token_hash[^"]*)"/.exec(html)?.[1];
  if (!href) throw new Error('no invite link in the email');
  return href.replaceAll('&amp;', '&');
}

/** The email points at NEXT_PUBLIC_APP_URL; tests run on another port, so keep path + query. */
async function openInvite(page: Page, link: string) {
  const url = new URL(link);
  await page.goto(`${url.pathname}${url.search}`);
}

test.describe('people lists', () => {
  test('admin sees seeded students with counts and can search', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/students');
    await expect(page.getByRole('heading', { level: 1, name: 'Élèves' })).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Liste des élèves' }).getByRole('listitem'),
    ).toHaveCount(20);
    await expect(page.getByText('eleve01@almanar.test')).toBeVisible();

    await page.getByRole('searchbox', { name: 'Rechercher' }).fill('Taha');
    await page.getByRole('search').getByRole('button', { name: 'Rechercher' }).click();
    await expect(page).toHaveURL(/q=Taha/);
    const rows = page.getByRole('list', { name: 'Liste des élèves' }).getByRole('listitem');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Désactivé');
  });

  test('status filter and empty search state', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/students?status=inactive');
    // Other tests deactivate their own throwaway students, so assert on the seeded one only.
    const rows = page.getByRole('list', { name: 'Liste des élèves' }).getByRole('listitem');
    await expect(rows.filter({ hasText: 'Taha' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'Actif' })).toHaveCount(0);
    await page.goto('/dashboard/students?q=zzzzzz');
    await expect(page.getByRole('heading', { name: 'Aucun résultat' })).toBeVisible();
    await page.getByRole('link', { name: 'Réinitialiser' }).click();
    await expect(page).toHaveURL(/\/dashboard\/students$/);
  });

  test('pagination moves to the next page', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/students');
    await page.getByRole('link', { name: 'Suivant' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(
      page.getByRole('list', { name: 'Liste des élèves' }).getByRole('listitem').first(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Précédent' })).toBeVisible();
  });

  test('pending invitation from the seed is listed with its status', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/teachers');
    await expect(page.getByRole('heading', { name: 'Invitations en attente' })).toBeVisible();
    await expect(page.getByText('nadia@almanar.test').first()).toBeVisible();
  });

  test('another school never sees these people', async ({ page }) => {
    await login(page, 'direction@ibnrochd.test');
    await page.goto('/dashboard/students');
    await expect(page.getByRole('heading', { name: 'Aucun élève pour l’instant' })).toBeVisible();
    await expect(page.getByText('eleve01@almanar.test')).toHaveCount(0);
  });

  test('teachers and students cannot open the people pages', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/dashboard/teachers');
    await expect(page).toHaveURL(/\/teacher$/);
  });

  test('Arabic page is right-to-left with Arabic copy', async ({ page }) => {
    await login(page, ADMIN, PASSWORD, '/ar/login');
    await page.goto('/ar/dashboard/students');
    await expect(page.getByRole('heading', { level: 1, name: 'التلاميذ' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('invitations', () => {
  test('an empty invite form shows inline errors and focuses the first field', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/teachers');
    await page.getByRole('button', { name: 'Inviter un enseignant' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Envoyer l’invitation' }).click();
    await expect(dialog.getByRole('alert')).toHaveCount(3);
    await expect(dialog.getByLabel('Prénom')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('invite → email → choose password → signed in; then deactivate and reactivate', async ({
    page,
    browser,
  }, testInfo) => {
    const email = uniqueEmail('eleve', testInfo.project.name);
    await login(page, ADMIN);
    await inviteVia(page, 'students', 'Imane', email);

    // Pending: shown in the invitations panel with the address.
    await expect(page.getByRole('heading', { name: 'Invitations en attente' })).toBeVisible();
    await expect(page.getByText(email).first()).toBeVisible();

    // The invitee follows the emailed link in a separate browser context.
    const link = await inviteLink(email);
    const invitee = await (await browser.newContext(testInfo.project.use)).newPage();
    await openInvite(invitee, link);
    await expect(invitee).toHaveURL(/\/set-password$/);
    await invitee.getByLabel('Nouveau mot de passe').fill(NEW_PASSWORD);
    await invitee.getByLabel('Confirmer le mot de passe').fill('different-1234');
    await invitee.getByRole('button', { name: 'Enregistrer et continuer' }).click();
    await expect(invitee.getByText('Les mots de passe ne correspondent pas.')).toBeVisible();
    await invitee.getByLabel('Confirmer le mot de passe').fill(NEW_PASSWORD);
    await invitee.getByRole('button', { name: 'Enregistrer et continuer' }).click();
    await expect(invitee).toHaveURL(/\/student$/);
    await expect(invitee.getByRole('heading', { level: 1 })).toHaveText('Bonjour, Imane');

    // Accepted: the invitation is closed and the student is a normal active member.
    await page.goto(`/dashboard/students?q=${encodeURIComponent(email)}`);
    const row = page.getByRole('listitem').filter({ hasText: email });
    await expect(row).toContainText('Actif');

    // Deactivate (with confirmation).
    await row.getByRole('button', { name: /^Désactiver / }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Désactiver', exact: true }).click();
    await expect(page.getByText('Compte désactivé.')).toBeVisible();
    await expect(row).toContainText('Désactivé');

    // The deactivated student can no longer sign in.
    const other = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(other, email, NEW_PASSWORD, '/login', { expectSuccess: false });
    await expect(
      other.getByText('Ce compte est désactivé. Contactez votre établissement.'),
    ).toBeVisible();

    // Reactivate: they can sign in again.
    await row.getByRole('button', { name: /^Réactiver / }).click();
    await expect(page.getByText('Compte réactivé.')).toBeVisible();
    await expect(row).toContainText('Actif');
    await login(other, email, NEW_PASSWORD);
    await expect(other).toHaveURL(/\/student$/);
  });

  test('a person who has not accepted yet is managed through the invitation only', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail('prof', testInfo.project.name);
    await login(page, ADMIN);
    await inviteVia(page, 'teachers', 'Karima', email);
    // Invited-but-not-accepted people can't be edited yet: only their invitation is managed.
    const invited = page.getByRole('listitem').filter({ hasText: email });
    await expect(invited.getByRole('button', { name: /^Modifier / })).toHaveCount(0);
  });

  test('resend and revoke a pending invitation', async ({ page }, testInfo) => {
    const email = uniqueEmail('prof', testInfo.project.name);
    await login(page, ADMIN);
    await inviteVia(page, 'teachers', 'Soukaina', email);

    const row = page.getByRole('listitem').filter({ hasText: email }).first();
    await row.getByRole('button', { name: `Renvoyer l’invitation à ${email}` }).click();
    await expect(page.getByText('Invitation renvoyée.')).toBeVisible();

    await row.getByRole('button', { name: `Révoquer l’invitation de ${email}` }).click();
    await expect(page.getByText('Invitation révoquée.')).toBeVisible();
    await expect(page.getByText(email)).toHaveCount(0);

    // The address is free again: inviting it a second time works.
    await inviteVia(page, 'teachers', 'Soukaina', email);
  });

  test('inviting an address that is already pending is refused', async ({ page }, testInfo) => {
    const email = uniqueEmail('dup', testInfo.project.name);
    await login(page, ADMIN);
    await inviteVia(page, 'students', 'Doublon', email);
    await page.getByRole('button', { name: 'Inviter un élève' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Prénom').fill('Doublon');
    await dialog.getByLabel('Nom', { exact: true }).fill('Testeur');
    await dialog.getByLabel('Adresse e-mail').fill(email);
    await dialog.getByRole('button', { name: 'Envoyer l’invitation' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Cet élément existe déjà.');
  });
});

test('an expired or invalid invite link falls back to login with a notice', async ({ page }) => {
  await page.goto('/auth/confirm?token_hash=not-a-real-token&type=invite');
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await expect(page.getByRole('alert').filter({ hasText: 'expiré' })).toBeVisible();
});
