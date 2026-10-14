import { expect, test, type Page } from '@playwright/test';

// Module switches change what a whole role sees, so this file runs alone in the `modules` project
// (after every width project) and always restores what it switched.
const PASSWORD = 'Tadriss-dev-2026';
const ADMIN = 'admin2@almanar.test';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

test('switching a module off hides it for that role, and back on restores it', async ({
  page,
  browser,
}) => {
  await login(page, ADMIN);
  await page.goto('/dashboard/settings');
  const studentSwitch = page
    .getByRole('list', { name: 'Modules des élèves' })
    .getByRole('switch', { name: /Paiements pour Élèves/ });

  const student = await (await browser.newContext()).newPage();
  await student.setViewportSize({ width: 1280, height: 900 });
  await login(student, 'eleve31@almanar.test');
  await student.goto('/student/payments');
  await expect(student.getByRole('heading', { level: 1, name: 'Paiements' })).toBeVisible();

  try {
    await studentSwitch.click();
    await expect(page.getByText('Paiements est désactivé.')).toBeVisible();
    await expect(studentSwitch).not.toBeChecked();

    // The student's navigation drops the link and the page explains why.
    await student.goto('/student');
    await expect(student.getByRole('link', { name: 'Paiements' })).toHaveCount(0);
    await student.goto('/student/payments');
    await expect(
      student.getByRole('heading', { level: 1, name: 'Ce module n’est pas disponible' }),
    ).toBeVisible();
    // Other modules are unaffected.
    await student.goto('/student/homework');
    await expect(student.getByRole('heading', { level: 1, name: 'Devoirs' })).toBeVisible();
  } finally {
    await page.goto('/dashboard/settings');
    const again = page
      .getByRole('list', { name: 'Modules des élèves' })
      .getByRole('switch', { name: /Paiements pour Élèves/ });
    if ((await again.getAttribute('aria-checked')) === 'false') await again.click();
    await expect(again).toBeChecked();
  }

  await student.goto('/student/payments');
  await expect(student.getByRole('heading', { level: 1, name: 'Paiements' })).toBeVisible();
  await expect(student.getByRole('link', { name: 'Paiements' }).first()).toBeVisible();
});

test('a teacher module can be switched off too, without touching students', async ({
  page,
  browser,
}) => {
  await login(page, ADMIN);
  await page.goto('/dashboard/settings');
  const classes = page
    .getByRole('list', { name: 'Modules des enseignants' })
    .getByRole('switch', { name: /Classes pour Enseignants/ });
  const teacher = await (await browser.newContext()).newPage();
  await teacher.setViewportSize({ width: 1280, height: 900 });
  await login(teacher, 'prof1@almanar.test');

  try {
    await classes.click();
    await expect(classes).not.toBeChecked();
    await teacher.goto('/teacher/classes');
    await expect(
      teacher.getByRole('heading', { level: 1, name: 'Ce module n’est pas disponible' }),
    ).toBeVisible();
    await teacher.goto('/teacher/schedule');
    await expect(teacher.getByRole('heading', { level: 1 }).first()).not.toHaveText(
      'Ce module n’est pas disponible',
    );
  } finally {
    await page.goto('/dashboard/settings');
    const again = page
      .getByRole('list', { name: 'Modules des enseignants' })
      .getByRole('switch', { name: /Classes pour Enseignants/ });
    if ((await again.getAttribute('aria-checked')) === 'false') await again.click();
    await expect(again).toBeChecked();
  }
});
