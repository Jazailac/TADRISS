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
