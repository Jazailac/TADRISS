-- 0009_finance: fee plans, invoices, payments and numbered receipts. Forward-only.
--
-- Money rules, all enforced here (ADR 0004: integer centimes, never floats):
--  * an invoice or payment amount is immutable: a mistake is VOIDED and re-issued, never edited;
--  * a void can never be undone, an invoice with live payments cannot be voided;
--  * the sum of live payments never exceeds the invoice (checked under a row lock);
--  * invoice and receipt numbers are gapless per school and year and assigned by a trigger, so a
--    client can neither choose them nor leave holes (a rolled-back insert rolls its number back).

-- ─────────────────────────────────────────────────────────────────────────────
-- Gapless numbering
-- ─────────────────────────────────────────────────────────────────────────────

create table public.document_counters (
  institution_id uuid not null references public.institutions (id) on delete restrict,
  kind text not null check (kind in ('invoice', 'receipt')),
  year int not null check (year between 2000 and 2200),
  last_number int not null default 0 check (last_number >= 0),
  primary key (institution_id, kind, year)
);
alter table public.document_counters enable row level security;
revoke all on public.document_counters from anon, authenticated;
-- Nobody reads or writes counters through the API: only the numbering function below does.
create policy document_counters_tenant on public.document_counters
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));

-- SECURITY DEFINER (in `private`, unreachable from the API) because clients have no access to the
-- counter table. The upsert takes a row lock, which serialises concurrent inserts into one sequence.
create function private.next_document_number(inst uuid, doc_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text;
  y int;
  n int;
begin
  select timezone into tz from public.institutions where id = inst;
  y := extract(year from (now() at time zone coalesce(tz, 'UTC')))::int;
  insert into public.document_counters as c (institution_id, kind, year, last_number)
  values (inst, doc_kind, y, 1)
  on conflict (institution_id, kind, year) do update set last_number = c.last_number + 1
  returning last_number into n;
  return (case doc_kind when 'invoice' then 'F' else 'R' end) || '-' || y || '-' || lpad(n::text, 4, '0');
end;
$$;
revoke execute on function private.next_document_number(uuid, text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- fee_plans
-- ─────────────────────────────────────────────────────────────────────────────

create table public.fee_plans (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  amount_centimes bigint not null check (amount_centimes > 0 and amount_centimes <= 100000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint fee_plans_id_institution_key unique (id, institution_id)
);
create unique index fee_plans_name_key
  on public.fee_plans (institution_id, lower(btrim(name))) where deleted_at is null;

alter table public.fee_plans enable row level security;
create trigger fee_plans_set_updated_at before update on public.fee_plans
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- invoices
-- ─────────────────────────────────────────────────────────────────────────────

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  student_id uuid not null,
  fee_plan_id uuid,
  number text not null,
  description text not null check (char_length(btrim(description)) between 1 and 200),
  amount_centimes bigint not null check (amount_centimes > 0 and amount_centimes <= 100000000),
  due_date date not null,
  issued_on date not null default current_date,
  voided_at timestamptz,
  void_reason text check (void_reason is null or char_length(btrim(void_reason)) between 1 and 300),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_void_consistent check ((voided_at is null) = (void_reason is null)),
  foreign key (institution_id, student_id) references public.profiles (institution_id, id) on delete restrict,
  foreign key (fee_plan_id, institution_id) references public.fee_plans (id, institution_id) on delete restrict,
  constraint invoices_number_key unique (institution_id, number),
  constraint invoices_id_institution_key unique (id, institution_id),
  constraint invoices_id_student_key unique (id, student_id)
);
create index invoices_student_idx on public.invoices (student_id, due_date);
create index invoices_institution_due_idx on public.invoices (institution_id, due_date);
create index invoices_fee_plan_idx on public.invoices (fee_plan_id);

alter table public.invoices enable row level security;
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function private.set_updated_at();
create trigger invoices_require_student before insert on public.invoices
  for each row execute function private.require_profile_role('student', 'student_id');

-- ─────────────────────────────────────────────────────────────────────────────
-- payments
-- ─────────────────────────────────────────────────────────────────────────────

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  invoice_id uuid not null,
  student_id uuid not null,
  amount_centimes bigint not null check (amount_centimes > 0 and amount_centimes <= 100000000),
  method text not null check (method in ('cash', 'transfer', 'cheque', 'card')),
  paid_on date not null,
  reference text check (reference is null or char_length(btrim(reference)) between 1 and 100),
  receipt_number text not null,
  voided_at timestamptz,
  void_reason text check (void_reason is null or char_length(btrim(void_reason)) between 1 and 300),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_void_consistent check ((voided_at is null) = (void_reason is null)),
  foreign key (invoice_id, institution_id) references public.invoices (id, institution_id) on delete restrict,
  foreign key (invoice_id, student_id) references public.invoices (id, student_id) on delete restrict,
  constraint payments_receipt_key unique (institution_id, receipt_number)
);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_student_idx on public.payments (student_id);
create index payments_institution_paid_idx on public.payments (institution_id, paid_on);

alter table public.payments enable row level security;
create trigger payments_set_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Invariant triggers
-- ─────────────────────────────────────────────────────────────────────────────

create function private.assign_invoice_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.number := private.next_document_number(new.institution_id, 'invoice');
  return new;
end;
$$;
create function private.assign_receipt_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.receipt_number := private.next_document_number(new.institution_id, 'receipt');
  return new;
end;
$$;
revoke execute on function private.assign_invoice_number(), private.assign_receipt_number()
  from public, anon, authenticated;
create trigger invoices_assign_number before insert on public.invoices
  for each row execute function private.assign_invoice_number();
create trigger payments_assign_receipt before insert on public.payments
  for each row execute function private.assign_receipt_number();

-- A payment may not exceed what is still owed. Locking the invoice row first makes two admins
-- recording payments at the same instant queue up instead of both seeing the same balance.
create function private.guard_payment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv record;
  paid bigint;
begin
  -- This is a BEFORE trigger running as the table owner, so it fires ahead of the RLS check. Without
  -- this guard its error messages would tell any API caller whether a payment would exceed ANY
  -- invoice's balance (an oracle for other people's amounts). Authorise first; direct database
  -- sessions (migrations, seed) are not API roles and pass.
  if current_setting('role', true) in ('authenticated', 'anon')
     and ((select private.user_role()) is distinct from 'institution_admin'
          or new.institution_id is distinct from (select private.institution_id())) then
    raise exception 'not allowed to record payments' using errcode = '42501';
  end if;

  select amount_centimes, voided_at into inv
    from public.invoices where id = new.invoice_id and institution_id = new.institution_id for update;
  if not found then
    raise exception 'invoice_not_found' using errcode = 'P0002';
  end if;
  if inv.voided_at is not null then
    raise exception 'invoice_void' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_centimes), 0) into paid
    from public.payments where invoice_id = new.invoice_id and voided_at is null;
  if paid + new.amount_centimes > inv.amount_centimes then
    raise exception 'payment_exceeds_balance' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function private.guard_payment() from public, anon, authenticated;
create trigger payments_guard before insert on public.payments
  for each row execute function private.guard_payment();

-- A void is final, and an invoice with live payments cannot be voided (void the payments first).
create function private.guard_void() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.voided_at is not null and new.voided_at is distinct from old.voided_at then
    raise exception 'cannot_unvoid' using errcode = 'P0001';
  end if;
  if tg_table_name = 'invoices' and new.voided_at is not null and old.voided_at is null
     and exists (select 1 from public.payments p where p.invoice_id = new.id and p.voided_at is null) then
    raise exception 'has_payments' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function private.guard_void() from public, anon, authenticated;
create trigger invoices_guard_void before update of voided_at on public.invoices
  for each row execute function private.guard_void();
create trigger payments_guard_void before update of voided_at on public.payments
  for each row execute function private.guard_void();

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges: no deletes anywhere, amounts and numbers are never client-writable.
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.fee_plans, public.invoices, public.payments from anon, authenticated;
grant select on public.fee_plans, public.invoices, public.payments to authenticated;
grant insert (institution_id, name, description, amount_centimes) on public.fee_plans to authenticated;
grant update (name, description, deleted_at) on public.fee_plans to authenticated;
grant insert (institution_id, student_id, fee_plan_id, description, amount_centimes, due_date)
  on public.invoices to authenticated;
grant update (description, due_date, voided_at, void_reason) on public.invoices to authenticated;
grant insert (institution_id, invoice_id, student_id, amount_centimes, method, paid_on, reference)
  on public.payments to authenticated;
grant update (voided_at, void_reason) on public.payments to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: only the administration manages money; a student reads their own, non-void documents.
-- ─────────────────────────────────────────────────────────────────────────────

create policy fee_plans_tenant on public.fee_plans
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));
create policy fee_plans_select_admin on public.fee_plans
  for select to authenticated using ((select private.user_role()) in ('institution_admin', 'super_admin'));
create policy fee_plans_admin_insert on public.fee_plans
  for insert to authenticated with check ((select private.user_role()) = 'institution_admin');
create policy fee_plans_admin_update on public.fee_plans
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');

create policy invoices_tenant on public.invoices
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));
create policy invoices_select_admin on public.invoices
  for select to authenticated using ((select private.user_role()) in ('institution_admin', 'super_admin'));
create policy invoices_select_student on public.invoices
  for select to authenticated
  using ((select private.user_role()) = 'student' and student_id = (select auth.uid()) and voided_at is null);
create policy invoices_admin_insert on public.invoices
  for insert to authenticated with check ((select private.user_role()) = 'institution_admin');
create policy invoices_admin_update on public.invoices
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');

create policy payments_tenant on public.payments
  as restrictive for all to authenticated
  using ((select private.is_super_admin()) or institution_id = (select private.institution_id()))
  with check ((select private.is_super_admin()) or institution_id = (select private.institution_id()));
create policy payments_select_admin on public.payments
  for select to authenticated using ((select private.user_role()) in ('institution_admin', 'super_admin'));
create policy payments_select_student on public.payments
  for select to authenticated
  using ((select private.user_role()) = 'student' and student_id = (select auth.uid()) and voided_at is null);
create policy payments_admin_insert on public.payments
  for insert to authenticated with check ((select private.user_role()) = 'institution_admin');
create policy payments_admin_update on public.payments
  for update to authenticated
  using ((select private.user_role()) = 'institution_admin')
  with check ((select private.user_role()) = 'institution_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- Balances (a view that runs as the caller, so RLS still decides what each person sees)
-- ─────────────────────────────────────────────────────────────────────────────

create view public.invoice_balances with (security_invoker = true) as
select i.id, i.institution_id, i.student_id, i.fee_plan_id, i.number, i.description, i.amount_centimes,
       i.due_date, i.issued_on, i.voided_at, i.void_reason, i.created_at,
       coalesce(sum(p.amount_centimes) filter (where p.voided_at is null), 0)::bigint as paid_centimes,
       -- Precomputed because PostgREST cannot compare two columns in a filter.
       (i.amount_centimes - coalesce(sum(p.amount_centimes) filter (where p.voided_at is null), 0))::bigint as balance_centimes
  from public.invoices i
  left join public.payments p on p.invoice_id = i.id
 group by i.id;
revoke all on public.invoice_balances from anon, authenticated;
grant select on public.invoice_balances to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs (SECURITY INVOKER)
-- ─────────────────────────────────────────────────────────────────────────────

-- One invoice per active student of a class, from a fee plan. Students who already have a live
-- invoice for the same plan and due date are skipped, so running it twice never double-bills.
-- Numbers follow alphabetical order. Returns how many invoices were issued.
create function public.generate_invoices(
  p_fee_plan_id uuid, p_class_id uuid, p_due_date date, p_description text default null
)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan record;
  n int;
begin
  select institution_id, name, amount_centimes into plan
    from public.fee_plans where id = p_fee_plan_id and deleted_at is null;
  if not found then
    raise exception 'plan_not_found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.classes where id = p_class_id and deleted_at is null) then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;

  insert into public.invoices (institution_id, student_id, fee_plan_id, description, amount_centimes, due_date)
  select plan.institution_id, e.student_id, p_fee_plan_id,
         coalesce(nullif(btrim(p_description), ''), plan.name), plan.amount_centimes, p_due_date
    from public.enrolments e
    join public.profiles s on s.id = e.student_id
   where e.class_id = p_class_id and e.status = 'active'
     and not exists (select 1 from public.invoices i
                      where i.student_id = e.student_id and i.fee_plan_id = p_fee_plan_id
                        and i.due_date = p_due_date and i.voided_at is null)
   order by s.last_name, s.first_name, s.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Records a payment against an invoice and returns its receipt number. The student and school are
-- read from the invoice, so a caller cannot attach a payment to the wrong person.
create function public.record_payment(
  p_invoice_id uuid, p_amount_centimes bigint, p_method text, p_paid_on date, p_reference text default null
)
returns table (payment_id uuid, receipt_number text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inv record;
begin
  select institution_id, student_id into inv from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'invoice_not_found' using errcode = 'P0002';
  end if;
  return query
    insert into public.payments (institution_id, invoice_id, student_id, amount_centimes, method, paid_on, reference)
    values (inv.institution_id, p_invoice_id, inv.student_id, p_amount_centimes, p_method, p_paid_on, nullif(btrim(p_reference), ''))
    returning payments.id, payments.receipt_number;
end;
$$;

-- Headline numbers for the finance overview (voided documents are excluded). `p_today` is the
-- school's calendar day, passed in so "overdue" does not depend on the database server's clock.
create function public.finance_summary(p_today date)
returns table (billed bigint, collected bigint, outstanding bigint, overdue bigint, invoices bigint, overdue_invoices bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(amount_centimes), 0)::bigint,
         coalesce(sum(paid_centimes), 0)::bigint,
         coalesce(sum(balance_centimes), 0)::bigint,
         coalesce(sum(balance_centimes) filter (where due_date < p_today), 0)::bigint,
         count(*),
         count(*) filter (where due_date < p_today and balance_centimes > 0)
    from public.invoice_balances
   where voided_at is null
$$;

revoke execute on function public.generate_invoices(uuid, uuid, date, text) from public, anon;
revoke execute on function public.finance_summary(date) from public, anon;
grant execute on function public.finance_summary(date) to authenticated;
revoke execute on function public.record_payment(uuid, bigint, text, date, text) from public, anon;
grant execute on function public.generate_invoices(uuid, uuid, date, text) to authenticated;
grant execute on function public.record_payment(uuid, bigint, text, date, text) to authenticated;
