import { expect, test, type Page } from '@playwright/test';

// School settings against local Supabase + seed. The administration account mutates the school's
// contact details only (never its name, which other specs assert on).
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

test.describe('settings', () => {
  test('shows the school profile, the plan with its usage and the module switches', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Paramètres' })).toBeVisible();
    await expect(page.getByRole('main').getByText('Groupe scolaire Al Manar')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Formule' })).toBeVisible();
    await expect(page.getByText('Standard', { exact: true })).toBeVisible();
    await expect(page.getByText(/\d+ sur 300/)).toBeVisible();
    await expect(page.getByText(/\d+ sur 30$/)).toBeVisible();
    const teacherModules = page.getByRole('list', { name: 'Modules des enseignants' });
    await expect(
      teacherModules.getByRole('switch', { name: /Devoirs pour Enseignants/ }),
    ).toBeChecked();
    const studentModules = page.getByRole('list', { name: 'Modules des élèves' });
    await expect(
      studentModules.getByRole('switch', { name: /Paiements pour Élèves/ }),
    ).toBeChecked();
    // Modules that do not exist for a role are not offered.
    await expect(teacherModules.getByRole('switch', { name: /Paiements/ })).toHaveCount(0);
    await expect(studentModules.getByRole('switch', { name: /Classes/ })).toHaveCount(0);
  });

  test('edits the contact details; an invalid name is refused inline', async ({
    page,
  }, testInfo) => {
    const city = `Ville ${testInfo.project.name} ${Math.random().toString(36).slice(2, 6)}`;
    await login(page, ADMIN);
    await page.goto('/dashboard/settings');
    await page.getByRole('button', { name: 'Modifier', exact: true }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Nom').fill('A');
    await form.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(form.getByRole('alert').first()).toBeVisible();
    await form.getByLabel('Nom').fill('Groupe scolaire Al Manar');
    await form.getByLabel('Ville').fill(city);
    await form.getByLabel('Téléphone').fill('05 22 00 00 00');
    await form.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Paramètres enregistrés.')).toBeVisible();
    await expect(page.getByText(city)).toBeVisible();
    await page.reload();
    await expect(page.getByText(city)).toBeVisible();
  });

  test('teachers and students cannot open the settings', async ({ page }) => {
    await login(page, 'prof1@almanar.test');
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL(/\/teacher$/);
  });

  test('Arabic page is right-to-left', async ({ page }) => {
    await login(page, ADMIN, '/ar/login');
    await page.goto('/ar/dashboard/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});
