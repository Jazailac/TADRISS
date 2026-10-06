import { expect, test } from '@playwright/test';

// Auth forms validate with the shared zod schemas. Submission is wired in Phase 1.
test.describe('auth screens', () => {
  for (const path of ['/login', '/signup', '/ar/login', '/ar/signup', '/en/signup']) {
    test(`${path} renders without hitting the error boundary`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Réessayer|إعادة المحاولة|Try again/ }),
      ).toHaveCount(0);
    });
  }

  test('empty sign-up shows translated errors and focuses the first field', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: 'Créer mon espace' }).click();
    // Scoped to the form: Next.js adds its own role="alert" route announcer to every page.
    await expect(page.locator('form').getByRole('alert')).toHaveCount(5);
    await expect(page.getByLabel('Nom de l’établissement')).toBeFocused();
    await expect(page.getByLabel('Nom de l’établissement')).toHaveAttribute('aria-invalid', 'true');
  });

  test('Arabic errors are in Arabic', async ({ page }) => {
    await page.goto('/ar/login');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).last().click();
    await expect(page.locator('form').getByRole('alert').first()).toHaveText('هذا الحقل مطلوب.');
  });

  test('invalid email and short password get specific messages', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Nom de l’établissement').fill('Groupe scolaire Al Manar');
    await page.getByLabel('Prénom').fill('Salma');
    await page.getByLabel('Nom', { exact: true }).fill('Benali');
    await page.getByLabel('Adresse e-mail professionnelle').fill('pas-un-email');
    await page.getByLabel('Mot de passe', { exact: true }).fill('court');
    await page.getByRole('button', { name: 'Créer mon espace' }).click();
    await expect(page.getByText('Adresse e-mail invalide.')).toBeVisible();
    await expect(page.getByText('8 caractères minimum.')).toBeVisible();
  });

  test('valid sign-up shows the phase notice instead of a dead end', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Nom de l’établissement').fill('Groupe scolaire Al Manar');
    await page.getByLabel('Prénom').fill('Salma');
    await page.getByLabel('Nom', { exact: true }).fill('Benali');
    await page.getByLabel('Adresse e-mail professionnelle').fill('direction@almanar.ma');
    await page.getByLabel('Mot de passe', { exact: true }).fill('correct-horse');
    await page.getByRole('button', { name: 'Créer mon espace' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Formulaire valide' })).toBeVisible();
  });

  test('password visibility toggle', async ({ page }) => {
    await page.goto('/login');
    const pw = page.getByLabel('Mot de passe', { exact: true });
    await expect(pw).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Afficher le mot de passe' }).click();
    await expect(pw).toHaveAttribute('type', 'text');
  });
});
