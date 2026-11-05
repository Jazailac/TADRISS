import { expect, test, type Page } from '@playwright/test';

// Announcements and direct messages against local Supabase + seed (`pnpm dev:setup`).
// Widths run in parallel on the same seeded accounts, so every title and message is unique and
// no assertion depends on an exact unread count.
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

const unique = (tag: string, project: string) =>
  `${tag} ${project} ${Math.random().toString(36).slice(2, 7)}`;
const feed = (page: Page) => page.getByRole('list', { name: 'Liste des annonces' });
const row = (page: Page, title: string) =>
  feed(page).getByRole('listitem').filter({ hasText: title });

test.describe('announcements', () => {
  test('a student sees the seeded feed, pinned first, with unread notices marked', async ({
    page,
  }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/announcements');
    await expect(page.getByRole('heading', { level: 1, name: 'Annonces' })).toBeVisible();
    await expect(feed(page).getByRole('listitem').first()).toContainText('Rentrée scolaire');
    await expect(feed(page).getByRole('listitem').first()).toContainText('Épinglée');
    // The teachers-only notice is not addressed to a student.
    await expect(page.getByText('Réunion pédagogique vendredi')).toHaveCount(0);
    // A student cannot publish.
    await expect(page.getByRole('button', { name: 'Nouvelle annonce' })).toHaveCount(0);
  });

  test('admin publishes to students → a student reads it → reach, pin, delete and restore', async ({
    page,
    browser,
  }, testInfo) => {
    const title = unique('Annonce', testInfo.project.name);
    await login(page, ADMIN);
    await page.goto('/dashboard/announcements');

    await page.getByRole('button', { name: 'Nouvelle annonce' }).click();
    const form = page.getByRole('dialog');
    await form.getByRole('button', { name: 'Publier l’annonce' }).click();
    await expect(form.getByRole('alert').first()).toBeVisible();
    await form.getByLabel('Destinataires').selectOption({ label: 'Tous les élèves' });
    await form.getByLabel('Titre').fill(title);
    await form.getByLabel('Message').fill('Première ligne\nDeuxième ligne');
    await form.getByRole('button', { name: 'Publier l’annonce' }).click();
    await expect(page).toHaveURL(/\/dashboard\/announcements\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText('Deuxième ligne')).toBeVisible();
    await expect(page.getByText('Tous les élèves').first()).toBeVisible();
    await expect(page.getByText('Personne n’a encore lu cette annonce.')).toBeVisible();
    const detailUrl = page.url();

    // A student sees it as unread, opens it, and it stops being unread.
    const student = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(student, 'eleve02@almanar.test');
    await student.goto('/student/announcements');
    await expect(row(student, title)).toContainText('Non lue');
    await row(student, title).click();
    await expect(student.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(async () => {
      await student.goto('/student/announcements');
      await expect(row(student, title)).toBeVisible();
      await expect(row(student, title)).not.toContainText('Non lue');
    }).toPass();

    // A teacher is not in the audience.
    const teacher = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(teacher, 'prof1@almanar.test');
    await teacher.goto('/teacher/announcements');
    await expect(teacher.getByRole('heading', { level: 1, name: 'Annonces' })).toBeVisible();
    await expect(teacher.getByText(title)).toHaveCount(0);

    // The administration sees that at least one person has read it.
    await page.goto(detailUrl);
    await expect(page.getByText(/^[1-9]\d*\/\d+ ont lu$/).first()).toBeVisible();

    // Pin, then unpin.
    await page.getByRole('button', { name: 'Épingler' }).click();
    await expect(page.getByText('Annonce épinglée.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Désépingler' })).toBeVisible();
    await page.getByRole('button', { name: 'Désépingler' }).click();
    await expect(page.getByText('Annonce désépinglée.')).toBeVisible();

    // Delete: students lose it; the administration can restore it.
    await page.getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText('Annonce supprimée.')).toBeVisible();
    await expect(page.getByText('Cette annonce est supprimée')).toBeVisible();
    await student.goto('/student/announcements');
    await expect(student.getByText(title)).toHaveCount(0);
    await page.getByRole('button', { name: 'Restaurer' }).click();
    await expect(page.getByText('Annonce restaurée.')).toBeVisible();
    await student.goto('/student/announcements');
    await expect(row(student, title)).toBeVisible();
  });

  test('a teacher addresses only their own classes, and only those students see it', async ({
    page,
    browser,
  }, testInfo) => {
    const title = unique('Classe', testInfo.project.name);
    await login(page, 'prof3@almanar.test');
    await page.goto('/teacher/announcements');
    await page.getByRole('button', { name: 'Nouvelle annonce' }).click();
    const form = page.getByRole('dialog');
    const audience = form.getByLabel('Destinataires');
    // No school-wide option, and no class they do not teach.
    await expect(audience.getByRole('option', { name: 'Tout l’établissement' })).toHaveCount(0);
    await expect(audience.getByRole('option', { name: 'Tous les élèves' })).toHaveCount(0);
    await expect(audience.getByRole('option', { name: /Classe\s*:\s*6ème A/ })).toHaveCount(0);
    await audience.selectOption({ index: 0 });
    const label = await audience.locator('option:checked').innerText();
    await form.getByLabel('Titre').fill(title);
    await form.getByLabel('Message').fill('Pour la classe.');
    await form.getByRole('button', { name: 'Publier l’annonce' }).click();
    await expect(page).toHaveURL(/\/teacher\/announcements\/[0-9a-f-]{36}$/);
    await expect(page.getByText(label.replace(/^Classe\s*:\s*/, '')).first()).toBeVisible();
    // A teacher cannot pin.
    await expect(page.getByRole('button', { name: 'Épingler' })).toHaveCount(0);

    // prof3 teaches 6ème B? Whichever class it is, a student of another class never sees it.
    const className = label.replace(/^Classe\s*:\s*/, '');
    const other = className === '6ème A' ? 'eleve09@almanar.test' : 'eleve01@almanar.test';
    const outsider = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(outsider, other);
    await outsider.goto('/student/announcements');
    await expect(outsider.getByRole('heading', { level: 1, name: 'Annonces' })).toBeVisible();
    await expect(outsider.getByText(title)).toHaveCount(0);
  });

  test('guards: a student cannot open the admin or teacher pages', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/dashboard/announcements');
    await expect(page).toHaveURL(/\/student$/);
    await page.goto('/teacher/messages');
    await expect(page).toHaveURL(/\/student$/);
  });

  test('an announcement that does not exist shows an in-app not-found page', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    await page.goto('/student/announcements/00000000-0000-4000-8000-0000000009ff');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Annonce introuvable' }),
    ).toBeVisible();
  });

  test('Arabic page is right-to-left', async ({ page }) => {
    await login(page, 'eleve01@almanar.test', '/ar/login');
    await page.goto('/ar/student/announcements');
    await expect(page.getByRole('heading', { level: 1, name: 'الإعلانات' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('messages', () => {
  test('a student writes to a teacher, the teacher replies, both see the thread and read marks', async ({
    page,
    browser,
  }, testInfo) => {
    const ask = unique('Question', testInfo.project.name);
    const reply = unique('Réponse', testInfo.project.name);
    await login(page, 'eleve03@almanar.test');
    await page.goto('/student/messages');
    await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible();

    // The recipients offered are teachers and the administration, never other students.
    await page.getByRole('button', { name: 'Nouveau message' }).first().click();
    const form = page.getByRole('dialog');
    const to = form.getByLabel('Destinataire');
    await expect(to.getByRole('option', { name: /Ahmed Tazi · Enseignant/ })).toHaveCount(1);
    await expect(to.getByRole('option', { name: /Élève$/ })).toHaveCount(0);
    await to.selectOption({ label: 'Ahmed Tazi · Enseignant' });
    await form.getByLabel('Message').fill(ask);
    await form.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page).toHaveURL(/\/student\/messages\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Ahmed Tazi' })).toBeVisible();
    await expect(page.getByText(ask)).toBeVisible();
    const threadUrl = page.url();

    // The teacher sees it unread in their inbox, opens it, and answers.
    const teacher = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(teacher, 'prof1@almanar.test');
    await teacher.goto('/teacher/messages');
    const conversation = teacher.getByRole('link', {
      name: /Ouvrir la conversation avec Salma Tazi/,
    });
    await expect(conversation).toContainText(ask);
    await conversation.click();
    await expect(teacher.getByText(ask)).toBeVisible();
    await teacher.getByLabel('Votre message').fill(reply);
    await teacher.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(teacher.getByText(reply)).toBeVisible();
    // Sent but not yet read by the student.
    await expect(teacher.getByText('Envoyé').last()).toBeAttached();

    // The student sees the answer; opening the thread marks it read, which the teacher then sees.
    await page.goto(threadUrl);
    await expect(page.getByText(reply)).toBeVisible();
    await expect(async () => {
      await teacher.reload();
      await expect(teacher.getByText('Lu', { exact: true }).last()).toBeAttached();
    }).toPass();
  });

  test('messages are private: the administration cannot read a student–teacher thread', async ({
    page,
  }) => {
    // The seed has Yasmine ↔ Ahmed. The administration is not part of it.
    await login(page, ADMIN);
    await page.goto('/dashboard/messages');
    await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible();
    await expect(page.getByText('Yasmine El Idrissi')).toHaveCount(0);
  });

  test('a student cannot open a thread with someone they cannot write to', async ({ page }) => {
    await login(page, 'eleve01@almanar.test');
    // eleve02 is a classmate: not a contact, and there is no history.
    await page.goto('/student/messages/10000000-0000-4000-8000-000000000202');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Conversation introuvable' }),
    ).toBeVisible();
  });

  test('a student writes to the administration; a blank message is refused inline', async ({
    page,
  }, testInfo) => {
    const body = unique('Bonjour Direction', testInfo.project.name);
    await login(page, 'eleve04@almanar.test');
    await page.goto('/student/messages');
    await page.getByRole('button', { name: 'Nouveau message' }).first().click();
    const form = page.getByRole('dialog');
    await form.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(form.getByRole('alert')).toHaveCount(1);
    await form.getByLabel('Destinataire').selectOption({ label: 'Salma Benali · Direction' });
    await form.getByLabel('Message').fill(body);
    await form.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page).toHaveURL(/\/student\/messages\/[0-9a-f-]{36}$/);
    await expect(page.getByText(body)).toBeVisible();
  });

  test('Arabic page is right-to-left', async ({ page }) => {
    await login(page, 'eleve01@almanar.test', '/ar/login');
    await page.goto('/ar/student/messages');
    await expect(page.getByRole('heading', { level: 1, name: 'الرسائل' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('nav badges', () => {
  test('a new announcement shows as an unread badge for its audience', async ({
    browser,
  }, testInfo) => {
    const title = unique('Badge', testInfo.project.name);
    const adminPage = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(adminPage, ADMIN);
    await adminPage.goto('/dashboard/announcements');
    await adminPage.getByRole('button', { name: 'Nouvelle annonce' }).click();
    const form = adminPage.getByRole('dialog');
    await form.getByLabel('Destinataires').selectOption({ label: 'Tous les élèves' });
    await form.getByLabel('Titre').fill(title);
    await form.getByLabel('Message').fill('Texte.');
    await form.getByRole('button', { name: 'Publier l’annonce' }).click();
    await expect(adminPage).toHaveURL(/\/dashboard\/announcements\/[0-9a-f-]{36}$/);

    const student = await (await browser.newContext(testInfo.project.use)).newPage();
    await login(student, 'eleve05@almanar.test');
    await student.goto('/student');
    await expect(student.getByRole('heading', { level: 1 }).first()).toBeVisible();
    // Wide screens show the sidebar badge; phones have it in the drawer and the bell.
    await student.getByRole('button', { name: 'Notifications' }).click();
    await expect(
      student
        .getByRole('dialog', { name: 'Notifications' })
        .getByRole('link', { name: /Annonces/ }),
    ).toContainText(/non lus?/);
  });
});
