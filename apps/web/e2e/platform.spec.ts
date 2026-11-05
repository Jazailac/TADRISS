import { expect, test, type Page } from '@playwright/test';

// The platform console against local Supabase + seed. Plans and suspensions change what a whole
// school sees, so this file runs alone in the `modules` project (after every width project) on the
// second tenant (Ibn Rochd), and always puts back what it changed.
const PASSWORD = 'Tadriss-dev-2026';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
}

test('the operator sees every school, with plans and head-counts', async ({ page }) => {
  await login(page, 'ops@tadriss.test');
  await page.waitForURL(/\/admin$/);
  await expect(page.getByRole('heading', { level: 1, name: /Bonjour, Omar/ })).toBeVisible();
  await expect(page.getByText('Établissements actifs')).toBeVisible();

  await page.goto('/admin/institutions');
  const list = page.getByRole('list', { name: 'Liste des établissements' });
  await expect(
    list.getByRole('listitem').filter({ hasText: 'Groupe scolaire Al Manar' }),
  ).toContainText(/\d+ élèves/);
  await expect(list.getByRole('listitem').filter({ hasText: 'École Ibn Rochd' })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Rechercher un établissement' }).fill('rochd');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/q=rochd/);
  await expect(list.getByRole('listitem')).toHaveCount(1);
});

test('changing a plan is audited, and a school cannot reach the console', async ({
  page,
  browser,
}) => {
  await login(page, 'ops@tadriss.test');
  await page.waitForURL(/\/admin$/);
  await page.goto('/admin/institutions');
  await page.getByRole('link', { name: /École Ibn Rochd/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'École Ibn Rochd' })).toBeVisible();

  const plan = page.getByLabel('Formule');
  const before = await plan.inputValue();
  try {
    await plan.selectOption('premium');
    await expect(page.getByText('Formule changée : Premium.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Formule')).toHaveValue('premium');
    await expect(page.getByText('Formule modifiée').first()).toBeVisible();
  } finally {
    await page.getByLabel('Formule').selectOption(before);
    await expect(page.getByLabel('Formule')).toHaveValue(before);
  }

  // The school's own administrator can neither open the console nor see another school's data.
  const school = await (await browser.newContext()).newPage();
  await login(school, 'direction@almanar.test');
  await school.waitForURL(/\/dashboard$/);
  await school.goto('/admin/institutions');
  await expect(school).toHaveURL(/\/dashboard$/);
});

test('a suspended school is locked out and can be restored', async ({ page, browser }) => {
  await login(page, 'ops@tadriss.test');
  await page.waitForURL(/\/admin$/);
  await page.goto('/admin/institutions');
  await page.getByRole('link', { name: /École Ibn Rochd/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'École Ibn Rochd' })).toBeVisible();

  try {
    await page.getByRole('button', { name: 'Suspendre', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Suspendre', exact: true }).click();
    await expect(page.getByText('Établissement suspendu.')).toBeVisible();
    await expect(page.getByText('Cet établissement est suspendu')).toBeVisible();

    // Its administrator can no longer sign in.
    const school = await (await browser.newContext()).newPage();
    await login(school, 'direction@ibnrochd.test');
    await expect(school.getByText('Ce compte est désactivé')).toBeVisible();
    await expect(school).toHaveURL(/\/login/);
  } finally {
    const restore = page.getByRole('button', { name: 'Rétablir l’accès' });
    if (await restore.isVisible()) await restore.click();
    await expect(page.getByText('Accès rétabli.')).toBeVisible();
  }

  const school = await (await browser.newContext()).newPage();
  await login(school, 'direction@ibnrochd.test');
  await expect(school).toHaveURL(/\/(ar\/)?dashboard$/);
});

test('the platform log lists the events, newest first', async ({ page }) => {
  await login(page, 'ops@tadriss.test');
  await page.waitForURL(/\/admin$/);
  await page.goto('/admin/audit');
  await expect(page.getByRole('heading', { level: 1, name: 'Journal d’activité' })).toBeVisible();
  await expect(page.getByText('Établissement suspendu').first()).toBeVisible();
  await expect(page.getByText('Accès rétabli').first()).toBeVisible();
});
