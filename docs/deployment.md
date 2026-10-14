# Deployment and operations checklist

Everything below must be true before a real school signs in. Items marked **(you)** need an account or a
decision that code cannot make.

## 1. Environments

- **(you)** A hosted Supabase project (EU region) and a Vercel project for `apps/web`.
- Web env (Vercel): `NEXT_PUBLIC_APP_URL` (exact production origin), `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only). No fallbacks: the app refuses to
  start if one is missing.
- Mobile: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the EAS build profile.
- Deploy order: `supabase db push` (migrations) → web. Never edit a merged migration.

## 2. Auth and email (real sending)

Invitations, password resets and confirmations are sent by Supabase Auth. Local development uses Mailpit; in
production configure custom SMTP, otherwise the shared sender is rate-limited to a few emails per hour:

1. **(you)** Create an SMTP account (Resend, Brevo, Postmark, SES…) and verify the sending domain (SPF, DKIM, DMARC).
2. Dashboard → Authentication → SMTP Settings: host, port, user, password, sender `no-reply@<your domain>`.
3. Authentication → URL Configuration: Site URL = `NEXT_PUBLIC_APP_URL`; add `<origin>/auth/confirm` to redirect URLs.
4. Authentication → Hooks: enable the **Custom Access Token** hook → `private.custom_access_token_hook`
   (without it nobody gets role/school claims).
5. Authentication → Rate limits: raise "emails per hour" to match your import sizes (CSV import sends one per row).
6. Edit the email templates (invite, recovery) to the school's voice, in French first.
7. Send yourself an invitation end to end and open the link on a phone.

## 3. Database safety

- **(you)** Enable daily backups (Pro plan: automated, 7 days) and, for paying schools, Point-in-Time Recovery.
- Restore drill, once, before launch: restore a backup into a scratch project and sign in as a seeded user.
- Auth → disable open sign-ups if you only onboard schools yourself (the `signup_intent` flow creates a school).
- Check Authentication → Policies: password length ≥ 8, leaked-password protection on.
- The service-role key lives only in Vercel server env. Rotate it if it is ever pasted anywhere.

## 4. Monitoring

- Uptime: point a monitor (UptimeRobot, BetterStack) at `GET /api/health` (returns `{"status":"ok"}`).
- Errors: **(you)** add Sentry (or similar) with the Next.js SDK; `app/[locale]/error.tsx` is the boundary to report from.
- Supabase: enable the database and auth log drains or at least review Logs weekly; set a disk-usage alert.
- Quotas to watch: database size, Storage (documents, 10 MB per file), auth emails per hour.

## 5. Privacy and legal (Morocco, law 09-08)

- `/privacy` is a plain-language policy (fr/ar/en). **(you)** Have a lawyer review it and fill in the legal entity,
  address and contact (`privacy@…`).
- The school is the data controller and must declare its processing to the CNDP; offer them a template.
- Sign a short data-processing agreement with each school (what you host, retention, return/deletion on exit).
- Document who can reach production data (service role, dashboard) and keep that list to the minimum.

## 6. Go-live smoke test

1. `pnpm lint && pnpm type-check && pnpm test && pnpm test:db && pnpm test:e2e` green on the release commit.
2. Create the school through `/signup`, invite one teacher, one student, one parent from the real mailbox.
3. Teacher: take attendance, publish an exam. Parent: sees the child's marks and the bulletin PDF print.
4. Admin: issue an invoice, record a payment, print the receipt.
5. Switch language to Arabic on a phone and check right-to-left on each of the above.
