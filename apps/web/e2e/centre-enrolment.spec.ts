import { expect, test, type Page } from '@playwright/test';

// Centre Atlas Soutien in the seed: Anas is in Maths and Physique, whose lessons don't overlap; SVT
// overlaps Maths on Mondays. A school's rule of one class per student is covered in classes.spec.ts.
const MATHS = '30000000-0000-4000-8000-000000000401';
const PHYSIQUE = '30000000-0000-4000-8000-000000000402';
const SVT = '30000000-0000-4000-8000-000000000403';
const ANAS = '30000000-0000-4000-8000-000000000201';
const main = (page: Page) => page.getByRole('main');

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill('Tadriss-dev-2026');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

const candidates: Record<string, string> = {
  w375: 'Hiba Ouazzani',
  w768: 'Reda Kettani',
  w1280: 'Salma Zerouali',
};

test('a centre enrols a student who is already in another group, then withdraws them', async ({
  page,
}, testInfo) => {
  const name = candidates[testInfo.project.name] ?? 'Hiba Ouazzani';
  await login(page, 'direction@atlas.test');
  await page.goto(`/dashboard/classes/${PHYSIQUE}`);
  await main(page).getByRole('button', { name: 'Ajouter des élèves' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Un élève peut suivre plusieurs groupes/)).toBeVisible();

  // They are in Maths already, and are offered anyway. Anas is already in this group, so he is not.
  await expect(dialog.getByRole('checkbox', { name: new RegExp(name) })).toBeVisible();
  await expect(dialog.getByText('Anas Tahiri')).toHaveCount(0);
  await dialog.getByRole('checkbox', { name: new RegExp(name) }).check();
  await dialog.getByRole('button', { name: /^Inscrire/ }).click();
  await expect(page.getByText(/1 élève inscrit/)).toBeVisible();

  const roster = main(page).getByRole('listitem').filter({ hasText: name });
  await expect(roster).toBeVisible();
  await page.goto(`/dashboard/classes/${MATHS}`);
  await expect(main(page).getByRole('listitem').filter({ hasText: name })).toBeVisible();

  // Put the seed back, so the spec can run again without a reset.
  await page.goto(`/dashboard/classes/${PHYSIQUE}`);
  await roster.getByRole('button', { name: /^Retirer / }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Retirer', exact: true }).click();
  await expect(main(page).getByRole('listitem').filter({ hasText: name })).toHaveCount(0);
});

test('the dialog warns about an overlapping group, without refusing it', async ({ page }) => {
  await login(page, 'direction@atlas.test');
  await page.goto(`/dashboard/classes/${SVT}`);
  await main(page).getByRole('button', { name: 'Ajouter des élèves' }).click();
  const dialog = page.getByRole('dialog');
  const anas = dialog.getByRole('listitem').filter({ hasText: 'Anas Tahiri' });
  await expect(anas.getByText('Chevauche Maths 2BAC')).toBeVisible();
  await expect(anas.getByRole('checkbox')).toBeEnabled();
  // Yassir is in no group, so nothing can overlap.
  const yassir = dialog.getByRole('listitem').filter({ hasText: 'Yassir Naciri' });
  await expect(yassir).toBeVisible();
  await expect(yassir.getByText(/Chevauche/)).toHaveCount(0);
});

test('the student file lists every group', async ({ page }) => {
  await login(page, 'direction@atlas.test');
  await page.goto(`/dashboard/students/${ANAS}`);
  await expect(main(page).getByRole('link', { name: /Maths 2BAC/ })).toBeVisible();
  await expect(main(page).getByRole('link', { name: /Physique 2BAC/ })).toBeVisible();
});

// The week grid and the phone agenda are both in the page, so look only at the one on screen.
test('a student sees the lessons and homework of all their groups', async ({ page }) => {
  await login(page, 'eleve01@atlas.test');
  await page.goto('/student/schedule');
  await expect(
    main(page).getByText('Mathématiques').filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(
    main(page).getByText('Physique-Chimie').filter({ visible: true }).first(),
  ).toBeVisible();
  await page.goto('/student/homework');
  await expect(main(page).getByText('Suites numériques, série 3')).toBeVisible();
  await expect(main(page).getByText('Ondes mécaniques, exercice 4')).toBeVisible();
});

test('a parent sees the lessons and homework of all their child’s groups', async ({ page }) => {
  await login(page, 'parent01@atlas.test');
  await page.goto('/parent');
  await expect(
    main(page)
      .getByText(/Maths 2BAC.*Physique 2BAC|Physique 2BAC.*Maths 2BAC/)
      .first(),
  ).toBeVisible();
  await page.goto('/parent/schedule');
  await expect(
    main(page).getByText('Mathématiques').filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(
    main(page).getByText('Physique-Chimie').filter({ visible: true }).first(),
  ).toBeVisible();
  await page.goto('/parent/homework');
  await expect(main(page).getByText('Suites numériques, série 3')).toBeVisible();
  await expect(main(page).getByText('Ondes mécaniques, exercice 4')).toBeVisible();
});

test('overlapping lessons both stay readable on the timetable', async ({ page }) => {
  await login(page, 'eleve06@atlas.test');
  await page.goto('/student/schedule');
  const lesson = (name: string) =>
    main(page).getByText(name, { exact: true }).filter({ visible: true }).first();
  await expect(lesson('Mathématiques')).toBeVisible();
  await expect(lesson('SVT')).toBeVisible();

  // On the week grid they sit side by side, neither covering the other. A phone agenda is a list.
  const [maths, svt] = await Promise.all([
    lesson('Mathématiques').boundingBox(),
    lesson('SVT').boundingBox(),
  ]);
  if (!maths || !svt) throw new Error('lessons have no layout');
  const sideBySide = maths.x + maths.width <= svt.x || svt.x + svt.width <= maths.x;
  const stacked = maths.y + maths.height <= svt.y || svt.y + svt.height <= maths.y;
  expect(sideBySide || stacked).toBe(true);
});
