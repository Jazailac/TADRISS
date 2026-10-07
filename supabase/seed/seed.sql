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

-- ── Phase 4: subjects and a weekly timetable (Al Manar) ─────────────────────
insert into public.subjects (id, institution_id, name, color) values
  ('10000000-0000-4000-8000-000000000501', '10000000-0000-4000-8000-000000000001', 'Mathématiques', 'primary'),
  ('10000000-0000-4000-8000-000000000502', '10000000-0000-4000-8000-000000000001', 'Français', 'accent'),
  ('10000000-0000-4000-8000-000000000503', '10000000-0000-4000-8000-000000000001', 'Arabe', 'success'),
  ('10000000-0000-4000-8000-000000000504', '10000000-0000-4000-8000-000000000001', 'Anglais', 'info'),
  ('10000000-0000-4000-8000-000000000505', '10000000-0000-4000-8000-000000000001', 'Sciences', 'warning'),
  ('10000000-0000-4000-8000-000000000506', '10000000-0000-4000-8000-000000000001', 'Histoire-Géo', 'accent');

-- class suffix (401..404), subject (501..506), teacher (101..103), weekday (1=Mon), start, end (minutes)
insert into public.timetable_slots (institution_id, class_id, subject_id, teacher_id, weekday, starts_min, ends_min, room)
select '10000000-0000-4000-8000-000000000001',
       ('10000000-0000-4000-8000-000000000' || m.cls)::uuid,
       ('10000000-0000-4000-8000-000000000' || m.subj)::uuid,
       ('10000000-0000-4000-8000-000000000' || m.tch)::uuid,
       m.wd, m.s, m.e, m.room
from (values
  -- 6ème A (prof1)
  ('401','501','101', 1, 510, 570, 'A1'), ('401','502','101', 1, 570, 630, 'A1'),
  ('401','505','101', 2, 510, 570, 'A1'), ('401','501','101', 3, 645, 705, 'A1'),
  ('401','502','101', 4, 510, 570, 'A1'), ('401','501','101', 5, 570, 630, 'A1'),
  -- 6ème B (prof2 + prof1)
  ('402','501','102', 1, 510, 570, 'B2'), ('402','502','101', 1, 645, 705, 'B2'),
  ('402','505','102', 2, 570, 630, 'B2'), ('402','502','101', 3, 510, 570, 'B2'),
  ('402','501','102', 4, 645, 705, 'B2'), ('402','504','101', 5, 510, 570, 'B2'),
  -- 5ème A (prof2 + prof3)
  ('403','505','102', 1, 570, 630, 'C3'), ('403','501','102', 2, 510, 570, 'C3'),
  ('403','505','102', 4, 510, 570, 'C3'), ('403','506','103', 1, 510, 570, 'C3'),
  ('403','504','103', 3, 570, 630, 'C3'), ('403','506','103', 5, 645, 705, 'C3'),
  -- 3ème Sciences (prof3)
  ('404','501','103', 1, 645, 705, 'D4'), ('404','505','103', 2, 645, 705, 'D4'),
  ('404','501','103', 3, 510, 570, 'D4'), ('404','506','103', 4, 570, 630, 'D4')
) as m(cls, subj, tch, wd, s, e, room);

-- A student who never gets a class (sorts last by surname, so e2e "first two candidates" never pick
-- them): used to show the "no class yet" states on student pages.
select pg_temp.seed_user('10000000-0000-4000-8000-000000000231', 'eleve31@almanar.test');
insert into public.profiles (id, institution_id, role, first_name, last_name, locale, email)
values ('10000000-0000-4000-8000-000000000231', '10000000-0000-4000-8000-000000000001',
        'student', 'Anouar', 'Zahiri', 'fr', 'eleve31@almanar.test');

-- ── Phase 5: three weeks of roll calls on fixed dates (14 Sep – 6 Oct 2026) ──
-- Statuses come from a hash of (student, date), so the seed is deterministic but looks organic:
-- ~90% present, ~5% late, ~4% absent, ~1% excused.
insert into public.attendance_sessions
  (institution_id, class_id, slot_id, subject_id, teacher_id, session_date, starts_min, ends_min, taken_by)
select ts.institution_id, ts.class_id, ts.id, ts.subject_id, ts.teacher_id, d::date, ts.starts_min, ts.ends_min, ts.teacher_id
from public.timetable_slots ts
join generate_series('2026-09-14'::date, '2026-10-06'::date, interval '1 day') d
  on extract(isodow from d) = ts.weekday
where ts.institution_id = '10000000-0000-4000-8000-000000000001';

insert into public.attendance_records (institution_id, session_id, student_id, status)
select s.institution_id, s.id, e.student_id,
       case when x.v < 4 then 'absent' when x.v < 9 then 'late' when x.v < 10 then 'excused' else 'present' end
from public.attendance_sessions s
join public.enrolments e on e.class_id = s.class_id and e.status = 'active'
cross join lateral (select abs(hashtext(e.student_id::text || s.session_date::text)) % 100 as v) x;

-- ── Phase 6: homework and who has done it (Al Manar) ────────────────────────
insert into public.homework (id, institution_id, class_id, subject_id, teacher_id, title, description, due_date) values
  ('10000000-0000-4000-8000-000000000601', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000401',
   '10000000-0000-4000-8000-000000000501', '10000000-0000-4000-8000-000000000101', 'Exercices 1 à 5, page 42', 'Les fractions : refaire les exercices en détaillant chaque étape.', '2026-10-02'),
  ('10000000-0000-4000-8000-000000000602', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000401',
   '10000000-0000-4000-8000-000000000502', '10000000-0000-4000-8000-000000000101', 'Rédaction : mon quartier', 'Une page, avec au moins trois adjectifs par paragraphe.', '2026-10-09'),
  ('10000000-0000-4000-8000-000000000603', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000401',
   '10000000-0000-4000-8000-000000000505', '10000000-0000-4000-8000-000000000101', 'Fiche de révision', null, '2026-10-14'),
  ('10000000-0000-4000-8000-000000000604', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000402',
   '10000000-0000-4000-8000-000000000501', '10000000-0000-4000-8000-000000000102', 'Problèmes de géométrie', 'Problèmes 3, 4 et 7 du manuel.', '2026-10-08'),
  ('10000000-0000-4000-8000-000000000605', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000402',
   '10000000-0000-4000-8000-000000000502', '10000000-0000-4000-8000-000000000101', 'Lecture du chapitre 3', null, '2026-10-12'),
  ('10000000-0000-4000-8000-000000000606', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000403',
   '10000000-0000-4000-8000-000000000505', '10000000-0000-4000-8000-000000000102', 'Exposé sur le cycle de l’eau', 'Par groupes de deux, cinq minutes à l’oral.', '2026-10-16'),
  ('10000000-0000-4000-8000-000000000607', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000403',
   '10000000-0000-4000-8000-000000000506', '10000000-0000-4000-8000-000000000103', 'Frise chronologique', 'Placer les dix dates clés du chapitre.', '2026-10-10');

-- ~65% of students have finished the older homework, ~30% the newer (deterministic hash).
insert into public.homework_completions (institution_id, homework_id, student_id, completed_at)
select h.institution_id, h.id, e.student_id, (h.due_date - 1)::timestamptz + interval '18 hours'
from public.homework h
join public.enrolments e on e.class_id = h.class_id and e.status = 'active'
cross join lateral (select abs(hashtext(e.student_id::text || h.id::text)) % 100 as v) x
where x.v < case when h.due_date < '2026-10-08' then 65 else 30 end;

-- ── Phase 7: exams and marks (Al Manar) ─────────────────────────────────────
-- Exam 703 is a DRAFT (unpublished) with only some marks entered.
insert into public.exams (id, institution_id, class_id, subject_id, teacher_id, title, exam_date, max_score, coefficient, term, published_at) values
  ('10000000-0000-4000-8000-000000000701', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000401', '10000000-0000-4000-8000-000000000501', '10000000-0000-4000-8000-000000000101', 'Contrôle 1 : les fractions', '2026-09-25', 20, 2, 1, '2026-09-28 09:00+00'),
  ('10000000-0000-4000-8000-000000000702', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000401', '10000000-0000-4000-8000-000000000502', '10000000-0000-4000-8000-000000000101', 'Dictée n°1', '2026-10-01', 10, 1, 1, '2026-10-02 09:00+00'),
  ('10000000-0000-4000-8000-000000000703', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000401', '10000000-0000-4000-8000-000000000505', '10000000-0000-4000-8000-000000000101', 'TP : le cycle de l’eau', '2026-10-06', 20, 1, 1, null),
  ('10000000-0000-4000-8000-000000000704', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000402', '10000000-0000-4000-8000-000000000501', '10000000-0000-4000-8000-000000000102', 'Contrôle 1 : la géométrie', '2026-09-26', 20, 2, 1, '2026-09-29 09:00+00'),
  ('10000000-0000-4000-8000-000000000705', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000402', '10000000-0000-4000-8000-000000000502', '10000000-0000-4000-8000-000000000101', 'Rédaction', '2026-10-02', 20, 1, 1, '2026-10-05 09:00+00'),
  ('10000000-0000-4000-8000-000000000706', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000403', '10000000-0000-4000-8000-000000000505', '10000000-0000-4000-8000-000000000102', 'Interrogation écrite', '2026-09-30', 20, 1, 1, '2026-10-01 09:00+00'),
  ('10000000-0000-4000-8000-000000000707', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000403', '10000000-0000-4000-8000-000000000506', '10000000-0000-4000-8000-000000000103', 'Frise chronologique', '2026-10-03', 10, 1, 1, '2026-10-05 09:00+00'),
  ('10000000-0000-4000-8000-000000000708', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000404', '10000000-0000-4000-8000-000000000501', '10000000-0000-4000-8000-000000000103', 'Brevet blanc', '2026-10-05', 20, 3, 1, '2026-10-06 09:00+00');

-- Marks come from a hash of (student, exam): 8-19 out of 20 scaled to the exam's maximum, in quarter
-- points, with an occasional absence. The draft exam only has marks for about half the class.
insert into public.grades (institution_id, exam_id, student_id, score, absent)
select x.institution_id, x.exam_id, x.student_id,
       case when x.is_absent then null else x.score end, x.is_absent
from (
  select ex.institution_id, ex.id as exam_id, e.student_id,
         abs(hashtext(e.student_id::text || ex.id::text || 'a')) % 23 = 0 as is_absent,
         round(((8 + (abs(hashtext(e.student_id::text || ex.id::text)) % 1100) / 100.0) / 20.0 * ex.max_score) * 4) / 4 as score,
         abs(hashtext(e.student_id::text || ex.id::text || 'd')) % 2 as half
  from public.exams ex
  join public.enrolments e on e.class_id = ex.class_id and e.status = 'active'
) x
join public.exams ex2 on ex2.id = x.exam_id
where ex2.published_at is not null or x.half = 0;

-- ── Phase 8: fees, invoices, payments (Al Manar) ────────────────────────────
insert into public.fee_plans (id, institution_id, name, description, amount_centimes) values
  ('10000000-0000-4000-8000-000000000801', '10000000-0000-4000-8000-000000000001', 'Inscription annuelle', 'Frais d’inscription pour l’année scolaire', 250000),
  ('10000000-0000-4000-8000-000000000802', '10000000-0000-4000-8000-000000000001', 'Scolarité mensuelle', null, 120000),
  ('10000000-0000-4000-8000-000000000803', '10000000-0000-4000-8000-000000000001', 'Transport scolaire', 'Abonnement mensuel', 40000);

-- Invoices through the real RPC, class by class, so numbers follow alphabetical order within a class.
select public.generate_invoices('10000000-0000-4000-8000-000000000801', c.id, '2026-09-15', 'Inscription 2026-2027')
from public.classes c where c.institution_id = '10000000-0000-4000-8000-000000000001' order by c.name;
select public.generate_invoices('10000000-0000-4000-8000-000000000802', c.id, '2026-10-05', 'Scolarité octobre 2026')
from public.classes c where c.institution_id = '10000000-0000-4000-8000-000000000001' order by c.name;

-- Payments: ~85% of registrations settled, ~10% half-paid; ~55% of October fees settled, ~15% half-paid.
insert into public.payments (institution_id, invoice_id, student_id, amount_centimes, method, paid_on, reference)
select i.institution_id, i.id, i.student_id,
       case when x.v < case when i.description like 'Inscription%' then 85 else 55 end then i.amount_centimes
            else i.amount_centimes / 2 end,
       (array['cash', 'transfer', 'cheque', 'card'])[1 + abs(hashtext(i.id::text)) % 4],
       case when i.description like 'Inscription%' then date '2026-09-10' + (abs(hashtext(i.id::text)) % 6)
            else date '2026-10-01' + (abs(hashtext(i.id::text)) % 5) end,
       case when abs(hashtext(i.id::text)) % 4 = 1 then 'VIR-' || lpad((abs(hashtext(i.id::text)) % 100000)::text, 5, '0') end
from public.invoices i
cross join lateral (select abs(hashtext(i.student_id::text || i.description)) % 100 as v) x
where i.institution_id = '10000000-0000-4000-8000-000000000001'
  and x.v < case when i.description like 'Inscription%' then 95 else 70 end
order by i.number;

-- One mistaken payment and one mistaken invoice, voided with a reason, to show the history.
update public.payments set voided_at = '2026-09-20 10:00+00', void_reason = 'Saisie en double'
where id = (select id from public.payments where amount_centimes = 250000 order by receipt_number limit 1);
update public.invoices set voided_at = '2026-10-02 10:00+00', void_reason = 'Facturée par erreur'
where id = (select i.id from public.invoices i
            where i.description like 'Scolarité%'
              and not exists (select 1 from public.payments p where p.invoice_id = i.id and p.voided_at is null)
            order by i.number desc limit 1);

-- `issued_on` defaults to the day the seed ran: pin it so the seed stays deterministic.
update public.invoices set issued_on = due_date - 14 where institution_id = '10000000-0000-4000-8000-000000000001';

-- ── Phase 9: announcements, who has read them, and a few conversations (Al Manar) ──
-- A is direction (Salma Benali); prof1 = Ahmed Tazi teaches 6ème A (401), eleve01 is in 6ème A.
insert into public.announcements (id, institution_id, author_id, audience, class_id, title, body, pinned, created_at) values
  ('10000000-0000-4000-8000-000000000901', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-0000000000a1', 'all', null,
   'Rentrée scolaire 2026-2027',
   E'Chers parents, chers élèves, chers enseignants,\n\nLa rentrée a eu lieu dans de très bonnes conditions. L’emploi du temps définitif est disponible dans votre espace.\n\nBonne année à toutes et à tous.', true, '2026-09-07 08:00+00'),
  ('10000000-0000-4000-8000-000000000902', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-0000000000a1', 'teachers', null,
   'Réunion pédagogique vendredi',
   E'Une réunion pédagogique aura lieu vendredi à 16 h en salle des professeurs.\nOrdre du jour : évaluations du premier trimestre et sorties scolaires.', false, '2026-10-01 09:30+00'),
  ('10000000-0000-4000-8000-000000000903', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-0000000000a1', 'students', null,
   'Journée sportive',
   E'La journée sportive de l’établissement aura lieu le 24 octobre. Prévoyez une tenue de sport et une gourde.', false, '2026-10-03 10:00+00'),
  ('10000000-0000-4000-8000-000000000904', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 'class', '10000000-0000-4000-8000-000000000401',
   'Contrôle de mathématiques lundi',
   E'Contrôle sur les fractions lundi prochain, première heure. Apportez votre matériel de géométrie.', false, '2026-10-05 15:00+00'),
  ('10000000-0000-4000-8000-000000000905', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-0000000000a1', 'all', null,
   'Fermeture exceptionnelle',
   E'L’établissement sera fermé le lundi 20 octobre. Les cours reprendront normalement le lendemain.', false, '2026-10-06 12:00+00');

-- Readers: about 70% of the people addressed have read the older notices, ~35% the newest.
insert into public.announcement_reads (institution_id, announcement_id, user_id, read_at)
select a.institution_id, a.id, p.id, a.created_at + interval '3 hours'
from public.announcements a
join public.profiles p on p.institution_id = a.institution_id and p.is_active and p.id <> a.author_id
  and (case a.audience when 'all' then p.role in ('teacher', 'student')
                       when 'teachers' then p.role = 'teacher'
                       when 'students' then p.role = 'student'
                       else p.id in (select e.student_id from public.enrolments e where e.class_id = a.class_id and e.status = 'active') end)
cross join lateral (select abs(hashtext(p.id::text || a.id::text)) % 100 as v) x
where x.v < case when a.created_at < '2026-10-05' then 70 else 35 end;

-- eleve01 has read everything except the newest two, so the unread dot is demonstrable.
delete from public.announcement_reads
where user_id = '10000000-0000-4000-8000-000000000201'
  and announcement_id in ('10000000-0000-4000-8000-000000000904', '10000000-0000-4000-8000-000000000905');

insert into public.messages (id, institution_id, sender_id, recipient_id, body, created_at, read_at) values
  ('10000000-0000-4000-8000-000000000a01', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000201', '10000000-0000-4000-8000-000000000101',
   'Bonjour Monsieur, je n’ai pas bien compris l’exercice 4 de la page 42. Pouvez-vous m’expliquer ?', '2026-10-05 17:10+00', '2026-10-05 18:00+00'),
  ('10000000-0000-4000-8000-000000000a02', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000201',
   'Bonjour Yasmine. Pense à simplifier la fraction avant de comparer. Nous en reparlons en classe demain.', '2026-10-05 18:20+00', '2026-10-05 19:00+00'),
  ('10000000-0000-4000-8000-000000000a03', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000201',
   'N’oublie pas ta fiche de révision pour mardi.', '2026-10-06 16:00+00', null),
  ('10000000-0000-4000-8000-000000000a04', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000101',
   'Bonjour Ahmed, pouvez-vous me remettre le calendrier de vos évaluations avant vendredi ?', '2026-10-06 09:00+00', null);

-- ── Phase 10: documents (Al Manar) ──────────────────────────────────────────
-- The rows are seeded here; scripts/seed-documents.sh uploads the matching files (each file's content
-- is its title and a newline, so `size_bytes` is deterministic) because SQL cannot write Storage bytes.
insert into public.documents (id, institution_id, uploader_id, audience, class_id, title, description, storage_path, file_name, mime_type, size_bytes, created_at)
select v.id, '10000000-0000-4000-8000-000000000001', v.uploader, v.audience, v.class_id, v.title, v.description,
       '10000000-0000-4000-8000-000000000001/' || v.id || '/' || v.file_name, v.file_name, 'text/plain',
       octet_length(v.title || E'\n'), v.created_at
from (values
  ('10000000-0000-4000-8000-000000000b01'::uuid, '10000000-0000-4000-8000-0000000000a1'::uuid, 'all', null::uuid,
   'Règlement intérieur', 'À lire et à respecter par tous.', 'reglement-interieur.txt', '2026-09-05 08:00+00'::timestamptz),
  ('10000000-0000-4000-8000-000000000b02', '10000000-0000-4000-8000-0000000000a1', 'all', null,
   'Calendrier scolaire 2026-2027', 'Vacances, jours fériés et examens.', 'calendrier-2026-2027.txt', '2026-09-05 08:30+00'),
  ('10000000-0000-4000-8000-000000000b03', '10000000-0000-4000-8000-0000000000a1', 'teachers', null,
   'Circulaire : évaluations du premier trimestre', null, 'circulaire-evaluations.txt', '2026-10-01 09:00+00'),
  ('10000000-0000-4000-8000-000000000b04', '10000000-0000-4000-8000-000000000101', 'class', '10000000-0000-4000-8000-000000000401',
   'Fiche de révision : les fractions', 'Pour le contrôle de lundi.', 'fiche-fractions.txt', '2026-10-05 15:30+00')
) as v(id, uploader, audience, class_id, title, description, file_name, created_at);
