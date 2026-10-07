-- Finance: who sees what, gapless numbering, overpayment, voiding, generate_invoices.
begin;
create extension if not exists pgtap with schema extensions;
select plan(59);

-- ── fixtures (as postgres) ───────────────────────────────────────────────────
insert into public.institutions (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000001', 'École A', 'ecole-a'),
  ('b0000000-0000-4000-8000-000000000001', 'École B', 'ecole-b');
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-0000000000aa', 'admin-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a7', 'teacher-a@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a1', 'student-a1@test.ma'),
  ('a0000000-0000-4000-8000-0000000000a2', 'student-a2@test.ma'),
  ('b0000000-0000-4000-8000-0000000000bb', 'admin-b@test.ma'),
  ('b0000000-0000-4000-8000-0000000000b1', 'student-b@test.ma');
-- Sami (a2) sorts before Sara (a1) by surname: generate_invoices numbers alphabetically.
insert into public.profiles (id, institution_id, role, first_name, last_name) values
  ('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000001', 'institution_admin', 'Amal', 'Admin'),
  ('a0000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-000000000001', 'teacher', 'Tarik', 'Prof'),
  ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sara', 'Zaki'),
  ('a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-000000000001', 'student', 'Sami', 'Alami'),
  ('b0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-000000000001', 'institution_admin', 'Badr', 'B'),
  ('b0000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-000000000001', 'student', 'Bilal', 'B');
insert into public.classes (id, institution_id, name, school_year) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '6A', '2026-2027');
insert into public.enrolments (institution_id, class_id, school_year, student_id) values
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a1'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-2027', 'a0000000-0000-4000-8000-0000000000a2');
insert into public.fee_plans (id, institution_id, name, amount_centimes) values
  ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Scolarité', 120000);
-- School B already has one invoice: its numbering is independent of A's.
insert into public.invoices (id, institution_id, student_id, description, amount_centimes, due_date) values
  ('b7000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000b1', 'Frais B', 50000, '2026-10-01');

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
declare c jsonb;
begin
  reset role;
  select (private.custom_access_token_hook(jsonb_build_object('user_id', uid, 'claims',
            jsonb_build_object('sub', uid, 'role', 'authenticated')))) -> 'claims' into c;
  perform set_config('request.jwt.claims', c::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
-- Runs a statement in a subtransaction and returns its error message (or 'ok').
create function pg_temp.try_msg(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlerrm; end $$;

-- ── admin A ──────────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000aa');
select is((select count(*) from public.invoices), 0::bigint, 'admin A: sees none of school B''s invoices');
select lives_ok($$ insert into public.fee_plans (institution_id, name, description, amount_centimes)
  values ('a0000000-0000-4000-8000-000000000001', 'Transport', 'Mensuel', 40000) $$, 'admin A: can create a fee plan');
select throws_ok($$ insert into public.fee_plans (institution_id, name, amount_centimes)
  values ('a0000000-0000-4000-8000-000000000001', ' transport ', 40000) $$, '23505', null, 'fee plan names are unique per school');
select throws_ok($$ insert into public.fee_plans (institution_id, name, amount_centimes)
  values ('a0000000-0000-4000-8000-000000000001', 'Gratuit', 0) $$, '23514', null, 'a fee plan needs a positive amount');
select throws_ok($$ insert into public.fee_plans (institution_id, name, amount_centimes)
  values ('b0000000-0000-4000-8000-000000000001', 'Pirate', 100) $$, '42501', null, 'admin A: cannot create plans in school B');

-- Invoices
select throws_ok($$ insert into public.invoices (institution_id, student_id, number, description, amount_centimes, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a1', 'F-2026-9999', 'x', 100, '2026-10-01') $$,
  '42501', null, 'a client cannot choose an invoice number');
select lives_ok($$ insert into public.invoices (institution_id, student_id, description, amount_centimes, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a1', 'Scolarité octobre', 120000, '2026-10-05') $$,
  'admin A: can issue an invoice');
select matches((select number from public.invoices), '^F-\d{4}-0001$', 'the first invoice is numbered 0001 for school A');
select is((select id from public.invoices where number like '%0001'), (select id from public.invoices), 'school B''s own 0001 does not collide');
select throws_ok($$ insert into public.invoices (institution_id, student_id, description, amount_centimes, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a1', 'x', 0, '2026-10-05') $$, '23514', null, 'an invoice needs a positive amount');
select throws_ok($$ insert into public.invoices (institution_id, student_id, description, amount_centimes, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000a7', 'x', 100, '2026-10-05') $$, '23514', null, 'only students can be invoiced');
select throws_ok($$ insert into public.invoices (institution_id, student_id, description, amount_centimes, due_date)
  values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000b1', 'x', 100, '2026-10-05') $$, '23514', null,
  'a student of another school cannot be invoiced');
select throws_ok($$ update public.invoices set amount_centimes = 1 $$, '42501', null, 'an invoice amount is immutable');
select throws_ok($$ update public.invoices set number = 'F-2026-0007' $$, '42501', null, 'an invoice number is immutable');
select throws_ok($$ delete from public.invoices $$, '42501', null, 'invoices are never deleted');

-- Payments: receipt numbers, overpayment, gapless on failure
create temp table pay as
  select * from public.record_payment((select id from public.invoices), 50000, 'cash', '2026-10-02', ' VIR-1 ');
select matches((select receipt_number from pay), '^R-\d{4}-0001$', 'the first receipt is R-…-0001');
select is((select reference from public.payments), 'VIR-1', 'the payment reference is trimmed');
select is((select paid_centimes from public.invoice_balances), 50000::bigint, 'invoice_balances sums live payments');
select throws_ok($$ select public.record_payment((select id from public.invoices), 100, 'bitcoin', '2026-10-04') $$,
  '23514', null, 'an unknown payment method is refused');
select matches(pg_temp.try_msg($$ select public.record_payment((select id from public.invoices), 70001, 'cash', '2026-10-03') $$),
  'payment_exceeds_balance', 'a payment above the remaining balance is refused');
create temp table pay2 as
  select * from public.record_payment((select id from public.invoices), 70000, 'transfer', '2026-10-03');
select matches((select receipt_number from pay2), '^R-\d{4}-0002$', 'a refused payment leaves no gap in receipt numbers');
select is((select paid_centimes from public.invoice_balances), 120000::bigint, 'the invoice is now fully paid');
select matches(pg_temp.try_msg($$ select public.record_payment((select id from public.invoices), 1, 'cash', '2026-10-04') $$),
  'payment_exceeds_balance', 'nothing more can be paid on a settled invoice');
select throws_ok($$ select public.record_payment('00000000-0000-4000-8000-000000000999', 100, 'cash', '2026-10-04') $$,
  'P0002', null, 'recording against an unknown invoice fails');
select throws_ok($$ update public.payments set amount_centimes = 1 $$, '42501', null, 'a payment amount is immutable');
select throws_ok($$ delete from public.payments $$, '42501', null, 'payments are never deleted');

-- Voiding
select matches(pg_temp.try_msg($$ update public.invoices set voided_at = now(), void_reason = 'oups' $$),
  'has_payments', 'an invoice with live payments cannot be voided');
select lives_ok($$ update public.payments set voided_at = now(), void_reason = 'Erreur de saisie'
  where receipt_number like '%0002' $$, 'admin A: can void a payment with a reason');
select is((select paid_centimes from public.invoice_balances), 50000::bigint, 'voiding a payment gives the balance back');
select matches(pg_temp.try_msg($$ update public.payments set voided_at = null, void_reason = null where receipt_number like '%0002' $$),
  'cannot_unvoid', 'a void cannot be undone');
select throws_ok($$ update public.payments set voided_at = now() where receipt_number like '%0001' $$, '23514', null,
  'a void needs a reason (check constraint)');
select matches((select receipt_number from public.payments where voided_at is not null), '^R-\d{4}-0002$', 'a voided receipt keeps its number');
create temp table pay3 as
  select * from public.record_payment((select id from public.invoices), 70000, 'card', '2026-10-05');
select matches((select receipt_number from pay3), '^R-\d{4}-0003$', 'numbers keep counting after a void (never reused)');

-- finance_summary (Sara: 120000 billed and fully paid with R-0001 + R-0003; R-0002 is voided)
select results_eq($$ select billed, collected, outstanding, overdue, invoices from public.finance_summary('2026-12-01') $$,
  $$ values (120000::bigint, 120000::bigint, 0::bigint, 0::bigint, 1::bigint) $$,
  'finance_summary: totals ignore voided payments and invoices');

-- generate_invoices
select is(public.generate_invoices('a6000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'Scolarité novembre'),
  2, 'generate_invoices: one invoice per enrolled student');
select is(public.generate_invoices('a6000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'Scolarité novembre'),
  0, 'generate_invoices: running it twice never double-bills');
select results_eq($$ select p.last_name from public.invoices i join public.profiles p on p.id = i.student_id
  where i.description = 'Scolarité novembre' order by i.number $$, $$ values ('Alami'), ('Zaki') $$,
  'generate_invoices: numbers follow alphabetical order');
select throws_ok($$ select public.generate_invoices('a6000000-0000-4000-8000-000000000999', 'a1000000-0000-4000-8000-000000000001', '2026-11-05') $$,
  'P0002', null, 'generate_invoices: unknown fee plan');
select lives_ok($$ update public.invoices set voided_at = now(), void_reason = 'Erreur'
  where description = 'Scolarité novembre' and student_id = 'a0000000-0000-4000-8000-0000000000a2' $$,
  'admin A: can void an unpaid invoice');
select matches(pg_temp.try_msg($$ select public.record_payment((select id from public.invoices where voided_at is not null), 100, 'cash', '2026-11-06') $$),
  'invoice_void', 'a payment cannot be recorded on a voided invoice');
select is(public.generate_invoices('a6000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'Scolarité novembre'),
  1, 'generate_invoices: a voided invoice is re-issued, the live one is skipped');
select results_eq($$ select billed, collected, outstanding, overdue, overdue_invoices from public.finance_summary('2026-12-01') $$,
  $$ values (360000::bigint, 120000::bigint, 240000::bigint, 240000::bigint, 2::bigint) $$,
  'finance_summary: unpaid invoices past their due date are overdue');

-- ── teacher: no financial access at all ──────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a7');
select is((select count(*) from public.invoices) + (select count(*) from public.payments) + (select count(*) from public.fee_plans)
  + (select count(*) from public.invoice_balances) + (select count(*) from public.finance_summary('2026-12-01') where invoices > 0), 0::bigint, 'teacher: sees no fee plans, invoices, payments or balances');
select throws_ok($$ select public.record_payment('00000000-0000-4000-8000-000000000999', 100, 'cash', '2026-11-06') $$, 'P0002', null,
  'teacher: cannot record payments');

-- ── students ─────────────────────────────────────────────────────────────────
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.invoices), 2::bigint, 'student Sara: sees only her own invoices');
select is((select count(*) from public.payments), 2::bigint, 'student Sara: sees her own live payments (the voided one is hidden)');
select is((select sum(paid_centimes)::bigint from public.invoice_balances), 120000::bigint, 'student Sara: balances are her own');
select is((select count(*) from public.fee_plans), 0::bigint, 'student: sees no fee plans');
select throws_ok($$ insert into public.payments (institution_id, invoice_id, student_id, amount_centimes, method, paid_on)
  values ('a0000000-0000-4000-8000-000000000001', (select id from public.invoices limit 1), 'a0000000-0000-4000-8000-0000000000a1', 100, 'cash', '2026-11-06') $$,
  '42501', null, 'student: cannot record payments');
select lives_ok($$ update public.invoices set voided_at = now(), void_reason = 'x' $$, 'student: voiding invoices is a silent no-op');
select is((select count(*) from public.invoices), 2::bigint, 'student Sara''s invoices are untouched');
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a2');
select results_eq($$ select description, voided_at is null from public.invoices $$, $$ values ('Scolarité novembre', true) $$,
  'student Sami: sees only his live, re-issued invoice (the voided one is hidden)');
select is((select count(*) from public.payments), 0::bigint, 'student Sami: sees no payments');
-- The overpayment check must not become a way to read other people's invoice amounts.
select pg_temp.as_user('a0000000-0000-4000-8000-0000000000a1');
select matches(pg_temp.try_msg($$ insert into public.payments (institution_id, invoice_id, student_id, amount_centimes, method, paid_on)
  values ('b0000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000b1', 999999999, 'cash', '2026-11-06') $$),
  'not allowed', 'a student probing school B''s invoice learns nothing about its balance (no overpayment oracle)');

-- ── other tenant and anon ────────────────────────────────────────────────────
select pg_temp.as_user('b0000000-0000-4000-8000-0000000000bb');
select is((select count(*) from public.invoices), 1::bigint, 'admin B: sees only school B''s invoice');
select throws_ok($$ select public.record_payment((select id from public.invoices where description = 'Scolarité octobre'), 100, 'cash', '2026-11-06') $$,
  'P0002', null, 'admin B: cannot pay school A''s invoice (it does not exist for them)');
select pg_temp.as_anon();
select throws_ok('select 1 from public.invoices', '42501', null, 'anon: no access to invoices');
select throws_ok('select 1 from public.invoice_balances', '42501', null, 'anon: no access to balances');
select ok(not has_function_privilege('anon', 'public.record_payment(uuid, bigint, text, date, text)', 'execute')
  and not has_function_privilege('anon', 'public.generate_invoices(uuid, uuid, date, text)', 'execute'),
  'anon cannot execute the finance RPCs');

select * from finish();
rollback;
