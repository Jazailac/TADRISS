import { expect, test } from '@playwright/test';

test('page switcher is usable entirely from the keyboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill('admin2@almanar.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Tadriss-dev-2026');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.waitForURL(/\/dashboard$/);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();

  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Aller à…' });
  const search = dialog.getByRole('textbox', { name: 'Aller à…' });
  await expect(search).toBeFocused();
  await search.fill('Classes');
  await search.press('ArrowDown');
  const destination = dialog.getByRole('link', { name: 'Classes', exact: true });
  await expect(destination).toBeFocused();
  await destination.press('Enter');
  await expect(page).toHaveURL(/\/dashboard\/classes$/);
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Classes');
});

test('page switcher: arrows walk the results, and only a real backdrop click closes it', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill('admin2@almanar.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Tadriss-dev-2026');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.waitForURL(/\/dashboard$/);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();

  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Aller à…' });
  const search = dialog.getByRole('textbox', { name: 'Aller à…' });
  await expect(search).toBeFocused();
  const results = dialog.getByRole('link');
  await page.keyboard.press('ArrowDown');
  await expect(results.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(results.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(search).toBeFocused();

  // On a phone the dialog leaves no backdrop to aim at.
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    const box = await search.boundingBox();
    if (!box) throw new Error('search box has no layout');
    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.down();
    await page.mouse.move(4, 4);
    await page.mouse.up();
    await expect(dialog).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(dialog).not.toBeVisible();
  }
});
