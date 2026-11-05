import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'Tadriss-dev-2026';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

test.describe('CSV import', () => {
  test('preview flags bad rows, then valid people are invited', async ({ page }) => {
    const run = Date.now().toString(36);
    await login(page, 'admin2@almanar.test');
    await page.goto('/dashboard/import');
    const csv = [
      'prénom;nom;email;rôle',
      `Nadia;Import;nadia.${run}@exemple.ma;parent`,
      'Sans;Courriel;pas-un-email;parent',
      `Nadia;Doublon;NADIA.${run}@exemple.ma;parent`,
    ].join('\n');
    await page.getByLabel('…ou collez le contenu ici').fill(csv);
    await expect(page.getByText('1 sur 3 lignes prêtes à être invitées')).toBeVisible();
    await expect(page.getByText('À corriger')).toBeVisible();
    await expect(page.getByText('Doublon', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Inviter 1 personne' }).click();
    await expect(page.getByText('1 invitations envoyées sur 1')).toBeVisible();
    await expect(page.getByText('Invitation envoyée')).toBeVisible();
  });

  test('a file without the needed columns is refused in the page', async ({ page }) => {
    await login(page, 'admin2@almanar.test');
    await page.goto('/dashboard/import');
    await page.getByLabel('…ou collez le contenu ici').fill('a,b\n1,2');
    await expect(page.getByText(/Colonnes manquantes/)).toBeVisible();
  });

  test('teachers cannot reach the import page', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/dashboard/import');
    await expect(page).toHaveURL(/\/teacher$/);
  });
});
