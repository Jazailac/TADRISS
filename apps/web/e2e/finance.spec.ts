import { expect, test, type Page } from '@playwright/test';

// Finance against local Supabase + seed (`pnpm dev:setup`). Amounts are shown as "1.200,00 MAD".
const PASSWORD = 'Tadriss-dev-2026';
const ADMIN = 'admin2@almanar.test';

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

const rows = (page: Page) =>
  page.getByRole('list', { name: 'Liste des factures' }).getByRole('listitem');
const unique = (tag: string, project: string) =>
  `${tag} ${project} ${Math.random().toString(36).slice(2, 7)}`;
/**
 * A due date no other run (or width) has used for this (plan, class): generation is idempotent
 * per (plan, class, due date), so a fixed date would make the second run on one database bill nobody.
 */
const dueFor = () => {
  const day = new Date(Date.UTC(2100, 0, 1) + Math.floor(Math.random() * 3000) * 86_400_000);
  return day.toISOString().slice(0, 10);
};

test.describe('finance: admin overview', () => {
  test('shows the headline numbers and the invoices, 20 to a page', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/finance');
    await expect(page.getByRole('heading', { level: 1, name: 'Finances' })).toBeVisible();
    for (const label of ['Facturé', 'Encaissé', 'Reste à payer', 'En retard']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(rows(page)).toHaveCount(20);
    await page.getByRole('link', { name: 'Suivant' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page).first()).toBeVisible();
  });

  test('status filters show only that status; void ones are listed apart', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/finance?status=void');
    // The seed holds one; the journey test below voids more, so don't pin the count.
    await expect(rows(page).first()).toBeVisible();
    await expect(rows(page).filter({ hasNotText: 'Annulée' })).toHaveCount(0);
    await page.goto('/dashboard/finance?status=paid');
    await expect(rows(page).first()).toBeVisible();
    const n = await rows(page).count();
    expect(n).toBeGreaterThan(0);
    await expect(rows(page).filter({ hasText: 'Payée' })).toHaveCount(n);
  });

  test('search finds a student by name and explains an empty result', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/finance?q=Alaoui');
    await expect(rows(page).first()).toContainText('Imane Alaoui');
    await page.goto('/dashboard/finance?q=zzzzzz');
    await expect(page.getByRole('heading', { name: 'Aucune facture trouvée' })).toBeVisible();
  });

  test('another school sees no invoices', async ({ page }) => {
    await login(page, 'direction@ibnrochd.test');
    await page.goto('/dashboard/finance');
    await expect(page.getByRole('heading', { name: 'Aucune facture' })).toBeVisible();
  });

  test('Arabic page is right-to-left', async ({ page }) => {
    await login(page, ADMIN, '/ar/login');
    await page.goto('/ar/dashboard/finance');
    await expect(page.getByRole('heading', { level: 1, name: 'المالية' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('finance: admin actions', () => {
  test('fee plans: create, reject a duplicate, archive and restore', async ({ page }, testInfo) => {
    const name = unique('Plan', testInfo.project.name);
    await login(page, ADMIN);
    await page.goto('/dashboard/finance');
    await page.getByRole('button', { name: 'Tarifs' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nom du tarif').fill(name);
    await dialog.getByLabel('Montant (MAD)').fill('99,90');
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByText('Tarif créé.')).toBeVisible();
    const row = dialog
      .getByRole('list', { name: 'Liste des tarifs' })
      .getByRole('listitem')
      .filter({ hasText: name });
    await expect(row).toContainText(/99,90\s*MAD/);

    await dialog.getByLabel('Nom du tarif').fill(name.toUpperCase());
    await dialog.getByLabel('Montant (MAD)').fill('10');
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Cet élément existe déjà.');

    await row.getByRole('button', { name: `Archiver ${name}` }).click();
    await expect(page.getByText('Tarif archivé.')).toBeVisible();
    await expect(row).toContainText('Archivé');
    await row.getByRole('button', { name: `Restaurer ${name}` }).click();
    await expect(page.getByText('Tarif restauré.')).toBeVisible();
  });

  test('generate a class’s invoices once; running it again bills nobody twice', async ({
    page,
  }, testInfo) => {
    const due = dueFor();
    const label = unique('Transport', testInfo.project.name);
    await login(page, ADMIN);
    await page.goto('/dashboard/finance');

    const generate = async () => {
      await page.getByRole('button', { name: 'Générer des factures' }).click();
      const dialog = page.getByRole('dialog');
      // The option text also carries the price, so find it by prefix (selectOption takes no regex).
      const plan = dialog.getByLabel('Tarif');
      const value = await plan.evaluate(
        (el: HTMLSelectElement) =>
          [...el.options].find((o) => o.textContent.startsWith('Transport scolaire'))?.value ?? '',
      );
      await plan.selectOption(value);
      await expect(dialog.getByText(/Chaque élève sera facturé 400,00\s*MAD/)).toBeVisible();
      await dialog.getByLabel('Classe').selectOption({ label: '3ème Sciences' });
      await dialog.getByLabel('Échéance').fill(due);
      await dialog.getByLabel('Libellé (facultatif)').fill(label);
      await dialog.getByRole('button', { name: 'Générer', exact: true }).click();
    };

    await generate();
    await expect(page.getByText('2 factures émises.')).toBeVisible();
    await page.goto(`/dashboard/finance?q=${encodeURIComponent(label)}`);
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).first()).toContainText(/400,00\s*MAD/);

    await page.goto('/dashboard/finance');
    await generate();
    await expect(
      page.getByText('Rien à générer : tous les élèves de la classe sont déjà facturés.'),
    ).toBeVisible();
    await page.goto(`/dashboard/finance?q=${encodeURIComponent(label)}`);
    await expect(rows(page)).toHaveCount(2);
  });

  test('an invoice’s whole life: issue, part-pay, refuse an overpayment, settle, receipt, void, and the student sees it', async ({
    page,
    browser,
  }, testInfo) => {
    const description = unique('Sortie', testInfo.project.name);
    await login(page, ADMIN);
    await page.goto('/dashboard/finance');

    // Issue a one-off invoice to Anouar Zahiri (the seeded student who has no class).
    await page.getByRole('button', { name: 'Nouvelle facture' }).click();
    const form = page.getByRole('dialog');
    await form.getByPlaceholder('Rechercher un élève…').fill('Zahiri');
    await form.getByRole('button', { name: /Anouar Zahiri/ }).click();
    await form.getByLabel('Libellé').fill(description);
    await form.getByLabel('Montant (MAD)').fill('350,50');
    await form.getByLabel('Échéance').fill('2099-01-01');
    await form.getByRole('button', { name: 'Émettre la facture' }).click();
    await expect(page).toHaveURL(/\/dashboard\/finance\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: description })).toBeVisible();
    await expect(page.getByText(/^F-\d{4}-\d{4}$/)).toBeVisible();
    await expect(page.getByText('Impayée')).toBeVisible();
    const invoiceUrl = page.url();

    // A part payment.
    await page.getByRole('button', { name: 'Enregistrer un paiement' }).click();
    const pay = page.getByRole('dialog');
    await expect(pay.getByText(/Reste à payer : 350,50\s*MAD/)).toBeVisible();
    await pay.getByLabel('Montant (MAD)').fill('100');
    await pay.getByLabel('Mode de paiement').selectOption({ label: 'Virement' });
    await pay.getByLabel('Référence (facultatif)').fill('VIR-42');
    await pay.getByRole('button', { name: 'Enregistrer et créer le reçu' }).click();
    await expect(page.getByText(/Paiement enregistré, reçu R-\d{4}-\d{4}\./)).toBeVisible();
    await expect(page.getByText('Partielle')).toBeVisible();

    // More than what is left is refused.
    await page.getByRole('button', { name: 'Enregistrer un paiement' }).click();
    await page.getByRole('dialog').getByLabel('Montant (MAD)').fill('300');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Enregistrer et créer le reçu' })
      .click();
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
      'Le montant dépasse le reste à payer.',
    );
    await page.getByRole('dialog').getByLabel('Montant (MAD)').fill('250,50');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Enregistrer et créer le reçu' })
      .click();
    await expect(page.getByText('Payée', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer un paiement' })).toBeDisabled();

    // The receipt prints on its own page, with its number and amount.
    const receiptHref = await page.getByRole('link', { name: 'Reçu' }).first().getAttribute('href');
    expect(receiptHref).toMatch(/\/receipt\/[0-9a-f-]{36}$/);
    await page.goto(receiptHref ?? '');
    await expect(page.getByRole('heading', { level: 1, name: 'Reçu de paiement' })).toBeVisible();
    await expect(page.getByText(/N° R-\d{4}-\d{4}/)).toBeVisible();
    await expect(page.getByText(/100,00\s*MAD/)).toBeVisible();
    await expect(page.getByText('Anouar Zahiri')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Imprimer' })).toBeVisible();

    // The student sees the invoice, the balance and both receipts.
    const student = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(student, 'eleve31@almanar.test');
    await student.goto('/student/payments');
    const card = student.getByRole('listitem').filter({ hasText: description }).first();
    await expect(card).toContainText('Payée');
    await expect(card.getByRole('link', { name: 'Reçu' })).toHaveCount(2);

    // Void a payment: it needs a reason and gives the balance back.
    await page.goto(invoiceUrl);
    await page.getByRole('button', { name: 'Annuler', exact: true }).first().click();
    const voidDialog = page.getByRole('dialog');
    await voidDialog.getByRole('button', { name: 'Annuler définitivement' }).click();
    await expect(voidDialog.getByRole('alert')).toHaveText('Ce champ est requis.');
    await voidDialog.getByLabel('Motif (obligatoire)').fill('Chèque rejeté');
    await voidDialog.getByRole('button', { name: 'Annuler définitivement' }).click();
    await expect(page.getByText('Paiement annulé.')).toBeVisible();
    await expect(page.getByText('Annulé : Chèque rejeté')).toBeVisible();
    await expect(page.getByText('Partielle')).toBeVisible();

    // An invoice with a live payment cannot be voided: the button is not offered.
    await expect(page.getByRole('button', { name: 'Annuler la facture' })).toHaveCount(0);
    // Void the other payment too, then the invoice.
    await page.getByRole('button', { name: 'Annuler', exact: true }).first().click();
    await page.getByRole('dialog').getByLabel('Motif (obligatoire)').fill('Remboursé');
    await page.getByRole('dialog').getByRole('button', { name: 'Annuler définitivement' }).click();
    await expect(page.getByText('Paiement annulé.')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler la facture' }).click();
    await page.getByRole('dialog').getByLabel('Motif (obligatoire)').fill('Sortie annulée');
    await page.getByRole('dialog').getByRole('button', { name: 'Annuler définitivement' }).click();
    await expect(page.getByText('Facture annulée.', { exact: true })).toBeVisible();
    await expect(page.getByText('Facture annulée. Motif : Sortie annulée')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer un paiement' })).toHaveCount(0);

    // A voided invoice disappears from the student's view.
    await student.reload();
    await expect(student.getByText(description)).toHaveCount(0);
  });
});

test.describe('finance: student and access control', () => {
  test('a student sees only their own invoices, what is owed and their receipts', async ({
    page,
  }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/payments');
    await expect(page.getByRole('heading', { level: 1, name: 'Finances' })).toBeVisible();
    await expect(page.getByText('Reste à payer').first()).toBeVisible();
    await expect(page.getByText('Déjà payé')).toBeVisible();
    const list = page.getByRole('list', { name: 'Mes factures' }).getByRole('listitem');
    await expect(list.first()).toContainText(/F-\d{4}-\d{4}/);
    // eleve01's own receipt opens; a made-up one does not.
    const href = await page.getByRole('link', { name: 'Reçu' }).first().getAttribute('href');
    await page.goto(href ?? '');
    await expect(page.getByRole('heading', { level: 1, name: 'Reçu de paiement' })).toBeVisible();
    await expect(page.getByText('Yasmine El Idrissi')).toBeVisible();
    await page.goto('/receipt/00000000-0000-4000-8000-0000000009ff');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Document introuvable' }),
    ).toBeVisible();
  });

  test('a student cannot open another student’s receipt', async ({ page, browser }, testInfo) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/payments');
    const href =
      (await page.getByRole('link', { name: 'Reçu' }).first().getAttribute('href')) ?? '';
    const other = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(other, 'eleve09@almanar.test');
    await other.goto(href);
    await expect(
      other.getByRole('heading', { level: 1, name: 'Document introuvable' }),
    ).toBeVisible();
    await expect(other.getByText('Yasmine El Idrissi')).toHaveCount(0);
  });

  test('teachers and students cannot open the admin finance pages', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/dashboard/finance');
    await expect(page).toHaveURL(/\/teacher$/);
    await page.goto('/receipt/00000000-0000-4000-8000-0000000009ff');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Document introuvable' }),
    ).toBeVisible();
  });

  test('a student has no admin finance pages and no payment controls', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/dashboard/finance');
    await expect(page).toHaveURL(/\/student$/);
    await page.goto('/student/payments');
    await expect(page.getByRole('button', { name: 'Enregistrer un paiement' })).toHaveCount(0);
  });
});
