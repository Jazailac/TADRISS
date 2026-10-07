-- Deterministic local seed. Applied by `supabase db reset` (config.toml [db.seed]).
-- Fixed UUIDs and names; no random(). Credentials: supabase/seed/README.md (local only).
-- Each feature slice extends this file together with its migration.

-- Seed users are inserted without `signup_intent`, so the onboarding trigger ignores them
-- and the institutions/profiles below keep their fixed ids.
create function pg_temp.seed_user(uid uuid, mail text) returns void language sql as $$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
    extensions.crypt('Tadriss-dev-2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (uid, uid, uid::text, jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true),
          'email', now(), now(), now());
$$;

-- ── institutions ─────────────────────────────────────────────────────────────
insert into public.institutions (id, name, slug, default_locale) values
  ('10000000-0000-4000-8000-000000000001', 'Groupe scolaire Al Manar', 'al-manar', 'fr'),
  ('20000000-0000-4000-8000-000000000001', 'École Ibn Rochd', 'ibn-rochd', 'ar');

-- ── platform operator ────────────────────────────────────────────────────────
select pg_temp.seed_user('00000000-0000-4000-8000-00000000000a', 'ops@tadriss.test');
insert into public.profiles (id, institution_id, role, first_name, last_name, locale)
values ('00000000-0000-4000-8000-00000000000a', null, 'super_admin', 'Omar', 'Ops', 'fr');

-- ── Al Manar: admin, 3 teachers, 30 students ─────────────────────────────────
select pg_temp.seed_user('10000000-0000-4000-8000-0000000000a1', 'direction@almanar.test');
insert into public.profiles (id, institution_id, role, first_name, last_name, locale)
values ('10000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000001',
        'institution_admin', 'Salma', 'Benali', 'fr');

with t(n, first_name, last_name) as (
  values (1, 'Ahmed', 'Tazi'), (2, 'Fatima', 'Alami'), (3, 'Youssef', 'Idrissi')
)
select pg_temp.seed_user(('10000000-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid,
                         'prof' || n || '@almanar.test')
from t;

insert into public.profiles (id, institution_id, role, first_name, last_name, locale)
select ('10000000-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid,
       '10000000-0000-4000-8000-000000000001', 'teacher', first_name, last_name, 'fr'
from (values (1, 'Ahmed', 'Tazi'), (2, 'Fatima', 'Alami'), (3, 'Youssef', 'Idrissi')) as t(n, first_name, last_name);

with names as (
  select n,
         (array['Yasmine','Omar','Salma','Hamza','Imane','Mehdi','Kenza','Ayoub','Rania','Anas',
                'Hiba','Ilyas','Nour','Adam','Aya','Zakaria','Malak','Othmane','Lina','Rayane',
                'Douae','Bilal','Meryem','Walid','Chaimae','Amine','Ghita','Saad','Houda','Taha'])[n] as first_name,
         (array['El Idrissi','Bennani','Tazi','Ouazzani','Alaoui','Berrada','Chraibi','Fassi','Lahlou','Kettani',
                'Benjelloun','Sqalli','Tahiri','Amrani','Bouzidi','Naciri','Lamrani','Zniber','Filali','Hajji',
                'Skalli','Mernissi','Belkadi','Sebti','Guessous','Rami','Squalli','Kabbaj','Bennis','Jaidi'])[n] as last_name
  from generate_series(1, 30) as n
)
select pg_temp.seed_user(('10000000-0000-4000-8000-0000000002' || lpad(n::text, 2, '0'))::uuid,
                         'eleve' || lpad(n::text, 2, '0') || '@almanar.test')
from names;

insert into public.profiles (id, institution_id, role, first_name, last_name, locale)
select ('10000000-0000-4000-8000-0000000002' || lpad(n::text, 2, '0'))::uuid,
       '10000000-0000-4000-8000-000000000001', 'student',
       (array['Yasmine','Omar','Salma','Hamza','Imane','Mehdi','Kenza','Ayoub','Rania','Anas',
              'Hiba','Ilyas','Nour','Adam','Aya','Zakaria','Malak','Othmane','Lina','Rayane',
              'Douae','Bilal','Meryem','Walid','Chaimae','Amine','Ghita','Saad','Houda','Taha'])[n],
       (array['El Idrissi','Bennani','Tazi','Ouazzani','Alaoui','Berrada','Chraibi','Fassi','Lahlou','Kettani',
              'Benjelloun','Sqalli','Tahiri','Amrani','Bouzidi','Naciri','Lamrani','Zniber','Filali','Hajji',
              'Skalli','Mernissi','Belkadi','Sebti','Guessous','Rami','Squalli','Kabbaj','Bennis','Jaidi'])[n],
       'fr'
from generate_series(1, 30) as n;

-- ── Ibn Rochd: a second tenant, used to demonstrate isolation ────────────────
select pg_temp.seed_user('20000000-0000-4000-8000-0000000000a1', 'direction@ibnrochd.test');
insert into public.profiles (id, institution_id, role, first_name, last_name, locale)
values ('20000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-000000000001',
        'institution_admin', 'Karim', 'Bensouda', 'ar');

-- ── Phase 2: emails, one pending invitation, one deactivated student ────────
update public.profiles p set email = lower(u.email) from auth.users u where u.id = p.id;

update public.profiles set is_active = false
where id = '10000000-0000-4000-8000-000000000230'::uuid; -- eleve30 (Taha Jaidi): deactivated

-- A pending invite goes through the real path: invitation row first, then an auth user with
-- `invited_at` set (what the admin invite API does), so `handle_new_user` provisions the profile.
insert into public.invitations (id, institution_id, email, role, first_name, last_name, invited_by)
values ('10000000-0000-4000-8000-0000000003a1', '10000000-0000-4000-8000-000000000001',
        'nadia@almanar.test', 'teacher', 'Nadia', 'Cherkaoui',
        '10000000-0000-4000-8000-0000000000a1');

insert into auth.users (
  instance_id, id, aud, role, email, invited_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000104',
  'authenticated', 'authenticated', 'nadia@almanar.test', now(),
  '{"provider":"email","providers":["email"]}',
  '{"signup_intent":"accept_invitation","invitation_id":"10000000-0000-4000-8000-0000000003a1","locale":"fr"}',
  now(), now(), '', '', '', ''
);

-- A second Al Manar admin, used by the people e2e suite so its sessions are independent of
-- the shared `direction@` account (Supabase sign-out is global: logging one out ends all its sessions).
select pg_temp.seed_user('10000000-0000-4000-8000-0000000000a2', 'admin2@almanar.test');
insert into public.profiles (id, institution_id, role, first_name, last_name, locale, email)
values ('10000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-000000000001',
        'institution_admin', 'Rachid', 'Lahlou', 'fr', 'admin2@almanar.test');

-- ── Phase 3: classes, teachers, enrolments (Al Manar, 2026-2027) ────────────
insert into public.classes (id, institution_id, name, level, school_year, capacity) values
  ('10000000-0000-4000-8000-000000000401', '10000000-0000-4000-8000-000000000001', '6ème A', '6ème', '2026-2027', 30),
  ('10000000-0000-4000-8000-000000000402', '10000000-0000-4000-8000-000000000001', '6ème B', '6ème', '2026-2027', 30),
  ('10000000-0000-4000-8000-000000000403', '10000000-0000-4000-8000-000000000001', '5ème A', '5ème', '2026-2027', 25),
  -- Deliberately full (capacity 2) to demonstrate the capacity rule.
  ('10000000-0000-4000-8000-000000000404', '10000000-0000-4000-8000-000000000001', '3ème Sciences', '3ème', '2026-2027', 2);

insert into public.class_teachers (class_id, teacher_id, institution_id)
select c.id, t.id, '10000000-0000-4000-8000-000000000001'
from (values
  ('10000000-0000-4000-8000-000000000401'::uuid, '10000000-0000-4000-8000-000000000101'::uuid),
  ('10000000-0000-4000-8000-000000000402', '10000000-0000-4000-8000-000000000101'),
  ('10000000-0000-4000-8000-000000000402', '10000000-0000-4000-8000-000000000102'),
  ('10000000-0000-4000-8000-000000000403', '10000000-0000-4000-8000-000000000102'),
  ('10000000-0000-4000-8000-000000000403', '10000000-0000-4000-8000-000000000103'),
  ('10000000-0000-4000-8000-000000000404', '10000000-0000-4000-8000-000000000103')
) as m(class_id, teacher_id)
join public.classes c on c.id = m.class_id
join public.profiles t on t.id = m.teacher_id;

-- Students 1-8 → 6ème A, 9-16 → 6ème B, 17-24 → 5ème A, 25-26 → 3ème Sciences (full).
-- Students 27-29 stay unenrolled (and 30 is deactivated) so "add students" has candidates.
insert into public.enrolments (institution_id, class_id, school_year, student_id)
select '10000000-0000-4000-8000-000000000001',
       ('10000000-0000-4000-8000-00000000040' || (case when n <= 8 then 1 when n <= 16 then 2 when n <= 24 then 3 else 4 end))::uuid,
       '2026-2027',
       ('10000000-0000-4000-8000-0000000002' || lpad(n::text, 2, '0'))::uuid
from generate_series(1, 26) as n;
