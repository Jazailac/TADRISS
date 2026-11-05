-- Self-serve sign-up sets the new institution's kind from `institution_kind`, accepting only school|centre.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('f1000000-0000-4000-8000-0000000000c1', 'dir@centre-nour.ma',
   '{"signup_intent":"create_institution","institution_kind":"centre","institution_name":"Centre Nour","first_name":"Nadia","last_name":"Amrani"}'),
  ('f1000000-0000-4000-8000-0000000000c2', 'dir@ecole-atlas.ma',
   '{"signup_intent":"create_institution","institution_kind":"school","institution_name":"École Atlas","first_name":"Omar","last_name":"Idrissi"}'),
  ('f1000000-0000-4000-8000-0000000000c3', 'dir@bogus.ma',
   '{"signup_intent":"create_institution","institution_kind":"support","institution_name":"Institut Bogus","first_name":"Hind","last_name":"Alami"}'),
  ('f1000000-0000-4000-8000-0000000000c4', 'dir@casing.ma',
   '{"signup_intent":"create_institution","institution_kind":"CENTRE","institution_name":"Institut Casse","first_name":"Rachid","last_name":"Tazi"}'),
  ('f1000000-0000-4000-8000-0000000000c5', 'dir@legacy.ma',
   '{"signup_intent":"create_institution","institution_name":"Institut Ancien","first_name":"Karim","last_name":"Fassi"}');

create function pg_temp.kind_of(p_user uuid) returns text language sql as $$
  select i.kind from public.profiles p join public.institutions i on i.id = p.institution_id where p.id = p_user
$$;

select is(pg_temp.kind_of('f1000000-0000-4000-8000-0000000000c1'), 'centre', 'signup: centre creates a centre');
select is(pg_temp.kind_of('f1000000-0000-4000-8000-0000000000c2'), 'school', 'signup: school creates a school');
select is(pg_temp.kind_of('f1000000-0000-4000-8000-0000000000c3'), 'school', 'signup: a bogus kind falls back to school');
select is(pg_temp.kind_of('f1000000-0000-4000-8000-0000000000c4'), 'school', 'signup: kind is case-sensitive, CENTRE is not a centre');
select is(pg_temp.kind_of('f1000000-0000-4000-8000-0000000000c5'), 'school', 'signup: no kind (older clients) makes a school');

-- The kind still cannot be changed through the API afterwards.
select ok(not has_column_privilege('authenticated', 'public.institutions', 'kind', 'update'),
  'signup: authenticated still cannot update institutions.kind');

select * from finish();
rollback;
