import type { TadrissClient } from './client';
import { err, ok, toErrorCode, type Result } from './result';
import { sanitizeSearch } from './people';
import type {
  FeePlanInput,
  GenerateInvoicesInput,
  InvoiceInput,
  PaymentInput,
  PaymentMethod,
  UpdateFeePlanInput,
  VoidInput,
} from './schemas/finance';

export const FINANCE_PAGE_SIZE = 20;

// ── fee plans ───────────────────────────────────────────────────────────────

export type FeePlan = {
  id: string;
  name: string;
  description: string | null;
  amountCentimes: number;
  archived: boolean;
};

export async function listFeePlans(
  client: TadrissClient,
  opts: { includeArchived?: boolean } = {},
): Promise<Result<FeePlan[]>> {
  let query = client
    .from('fee_plans')
    .select('id, name, description, amount_centimes, deleted_at')
    .order('name', { ascending: true })
    .limit(100);
  if (!opts.includeArchived) query = query.is('deleted_at', null);
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));
  return ok(
    data.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      amountCentimes: p.amount_centimes,
      archived: p.deleted_at !== null,
    })),
  );
}

export async function createFeePlan(
  client: TadrissClient,
  institutionId: string,
  input: FeePlanInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('fee_plans')
    .insert({
      institution_id: institutionId,
      name: input.name,
      description: input.description,
      amount_centimes: input.amount,
    })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

/** The amount of a fee plan never changes (invoices copy it); rename or archive and create a new one. */
export async function updateFeePlan(
  client: TadrissClient,
  input: UpdateFeePlanInput,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('fee_plans')
    .update({ name: input.name, description: input.description })
    .eq('id', input.id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

export async function setFeePlanArchived(
  client: TadrissClient,
  id: string,
  archived: boolean,
): Promise<Result<null>> {
  const { data, error } = await client
    .from('fee_plans')
    .update({ deleted_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

// ── invoices ────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'void' | 'paid' | 'overdue' | 'partial' | 'unpaid';
export const invoiceStatuses = ['unpaid', 'partial', 'paid', 'overdue', 'void'] as const;

/**
 * An invoice's state, derived (never stored): void beats everything; fully paid is paid; otherwise
 * past its due date is overdue (whether or not part was paid), else partial or unpaid.
 */
export function invoiceStatus(
  i: { voided: boolean; amountCentimes: number; paidCentimes: number; dueDate: string },
  today: string,
): InvoiceStatus {
  if (i.voided) return 'void';
  if (i.paidCentimes >= i.amountCentimes) return 'paid';
  if (i.dueDate < today) return 'overdue';
  return i.paidCentimes > 0 ? 'partial' : 'unpaid';
}

export type InvoiceView = {
  id: string;
  number: string;
  studentId: string;
  studentName: string;
  description: string;
  amountCentimes: number;
  paidCentimes: number;
  balanceCentimes: number;
  dueDate: string;
  issuedOn: string;
  voided: boolean;
  voidReason: string | null;
};

const BALANCE_COLUMNS =
  'id, student_id, number, description, amount_centimes, paid_centimes, balance_centimes, due_date, issued_on, voided_at, void_reason' as const;

type BalanceRow = {
  id: string;
  student_id: string;
  number: string;
  description: string;
  amount_centimes: number;
  paid_centimes: number;
  balance_centimes: number;
  due_date: string;
  issued_on: string;
  voided_at: string | null;
  void_reason: string | null;
};

type Nullable<T> = { [K in keyof T]: T[K] | null };

/**
 * The generated types mark every column of a Postgres view as nullable. These ones never are (they
 * come straight from NOT NULL columns), so narrow them here once instead of casting everywhere.
 */
function isComplete(r: Nullable<BalanceRow>): r is BalanceRow {
  return (
    r.id !== null &&
    r.student_id !== null &&
    r.number !== null &&
    r.description !== null &&
    r.amount_centimes !== null &&
    r.paid_centimes !== null &&
    r.balance_centimes !== null &&
    r.due_date !== null &&
    r.issued_on !== null
  );
}

async function withStudentNames(
  client: TadrissClient,
  rows: BalanceRow[],
): Promise<Result<InvoiceView[]>> {
  const ids = [...new Set(rows.map((r) => r.student_id))];
  const people =
    ids.length > 0
      ? await client.from('profiles').select('id, first_name, last_name').in('id', ids)
      : { data: [], error: null };
  if (people.error) return err(toErrorCode(people.error));
  const names = new Map(people.data.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
  return ok(
    rows.map((r) => ({
      id: r.id,
      number: r.number,
      studentId: r.student_id,
      studentName: names.get(r.student_id) ?? '',
      description: r.description,
      amountCentimes: r.amount_centimes,
      paidCentimes: r.paid_centimes,
      balanceCentimes: r.balance_centimes,
      dueDate: r.due_date,
      issuedOn: r.issued_on,
      voided: r.voided_at !== null,
      voidReason: r.void_reason,
    })),
  );
}

export type ListInvoicesOptions = {
  status?: InvoiceStatus | 'all';
  q?: string;
  /** The school's calendar day (`YYYY-MM-DD`), for "overdue". */
  today: string;
  page?: number;
};

export type InvoicePage = { rows: InvoiceView[]; total: number; page: number; pageSize: number };

export async function listInvoices(
  client: TadrissClient,
  opts: ListInvoicesOptions,
): Promise<Result<InvoicePage>> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const from = (page - 1) * FINANCE_PAGE_SIZE;
  let query = client
    .from('invoice_balances')
    .select(BALANCE_COLUMNS, { count: 'exact' })
    .order('due_date', { ascending: false })
    .order('number', { ascending: false })
    .range(from, from + FINANCE_PAGE_SIZE - 1);

  switch (opts.status) {
    case 'void':
      query = query.not('voided_at', 'is', null);
      break;
    case 'paid':
      query = query.is('voided_at', null).eq('balance_centimes', 0);
      break;
    case 'unpaid':
      query = query
        .is('voided_at', null)
        .gt('balance_centimes', 0)
        .eq('paid_centimes', 0)
        .gte('due_date', opts.today);
      break;
    case 'partial':
      query = query
        .is('voided_at', null)
        .gt('balance_centimes', 0)
        .gt('paid_centimes', 0)
        .gte('due_date', opts.today);
      break;
    case 'overdue':
      query = query.is('voided_at', null).gt('balance_centimes', 0).lt('due_date', opts.today);
      break;
    default:
      break;
  }

  const q = sanitizeSearch(opts.q ?? '');
  if (q) {
    const matches = await client
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(100);
    if (matches.error) return err(toErrorCode(matches.error));
    const ids = matches.data.map((m) => m.id);
    query = query.or(
      [
        `number.ilike.%${q}%`,
        `description.ilike.%${q}%`,
        ...(ids.length ? [`student_id.in.(${ids.join(',')})`] : []),
      ].join(','),
    );
  }

  const { data, count, error } = await query;
  if (error) return err(toErrorCode(error));
  const views = await withStudentNames(client, data.filter(isComplete));
  if (!views.ok) return views;
  return ok({ rows: views.data, total: count ?? 0, page, pageSize: FINANCE_PAGE_SIZE });
}

export type PaymentView = {
  id: string;
  receiptNumber: string;
  amountCentimes: number;
  method: PaymentMethod;
  paidOn: string;
  reference: string | null;
  voided: boolean;
  voidReason: string | null;
};

export async function listPayments(
  client: TadrissClient,
  invoiceIds: string[],
): Promise<Result<Map<string, PaymentView[]>>> {
  if (invoiceIds.length === 0) return ok(new Map());
  const { data, error } = await client
    .from('payments')
    .select(
      'id, invoice_id, receipt_number, amount_centimes, method, paid_on, reference, voided_at, void_reason',
    )
    .in('invoice_id', invoiceIds)
    .order('receipt_number', { ascending: true });
  if (error) return err(toErrorCode(error));
  const byInvoice = new Map<string, PaymentView[]>();
  for (const p of data) {
    byInvoice.set(p.invoice_id, [
      ...(byInvoice.get(p.invoice_id) ?? []),
      {
        id: p.id,
        receiptNumber: p.receipt_number,
        amountCentimes: p.amount_centimes,
        method: p.method as PaymentMethod,
        paidOn: p.paid_on,
        reference: p.reference,
        voided: p.voided_at !== null,
        voidReason: p.void_reason,
      },
    ]);
  }
  return ok(byInvoice);
}

export async function getInvoice(
  client: TadrissClient,
  id: string,
): Promise<Result<{ invoice: InvoiceView; payments: PaymentView[] }>> {
  const { data, error } = await client
    .from('invoice_balances')
    .select(BALANCE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  if (!data || !isComplete(data)) return err('not_found');
  const [views, payments] = await Promise.all([
    withStudentNames(client, [data]),
    listPayments(client, [id]),
  ]);
  if (!views.ok) return views;
  if (!payments.ok) return payments;
  const invoice = views.data[0];
  return invoice ? ok({ invoice, payments: payments.data.get(id) ?? [] }) : err('not_found');
}

/** A student's own invoices (RLS hides void ones and everyone else's), newest due date first, with payments. */
export async function listMyInvoices(
  client: TadrissClient,
): Promise<Result<(InvoiceView & { payments: PaymentView[] })[]>> {
  const { data, error } = await client
    .from('invoice_balances')
    .select(BALANCE_COLUMNS)
    .order('due_date', { ascending: false })
    .limit(200);
  if (error) return err(toErrorCode(error));
  const views = await withStudentNames(client, data.filter(isComplete));
  if (!views.ok) return views;
  const payments = await listPayments(
    client,
    views.data.map((v) => v.id),
  );
  if (!payments.ok) return payments;
  return ok(
    views.data.map((v) => ({
      ...v,
      payments: (payments.data.get(v.id) ?? []).filter((p) => !p.voided),
    })),
  );
}

export type FinanceSummary = {
  billedCentimes: number;
  collectedCentimes: number;
  outstandingCentimes: number;
  overdueCentimes: number;
  invoices: number;
  overdueInvoices: number;
};

export async function getFinanceSummary(
  client: TadrissClient,
  today: string,
): Promise<Result<FinanceSummary>> {
  const { data, error } = await client.rpc('finance_summary', { p_today: today });
  const row = data?.[0];
  if (error) return err(toErrorCode(error));
  if (!row) {
    return ok({
      billedCentimes: 0,
      collectedCentimes: 0,
      outstandingCentimes: 0,
      overdueCentimes: 0,
      invoices: 0,
      overdueInvoices: 0,
    });
  }
  return ok({
    billedCentimes: row.billed,
    collectedCentimes: row.collected,
    outstandingCentimes: row.outstanding,
    overdueCentimes: row.overdue,
    invoices: row.invoices,
    overdueInvoices: row.overdue_invoices,
  });
}

export async function createInvoice(
  client: TadrissClient,
  institutionId: string,
  input: InvoiceInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await client
    .from('invoices')
    .insert({
      institution_id: institutionId,
      student_id: input.studentId,
      description: input.description,
      amount_centimes: input.amount,
      due_date: input.dueDate,
    })
    .select('id')
    .single();
  if (error) return err(toErrorCode(error));
  return ok({ id: data.id });
}

/** One invoice per active student of a class. Returns how many were issued (0 = all already billed). */
export async function generateInvoices(
  client: TadrissClient,
  input: GenerateInvoicesInput,
): Promise<Result<{ issued: number }>> {
  const { data, error } = await client.rpc('generate_invoices', {
    p_fee_plan_id: input.feePlanId,
    p_class_id: input.classId,
    p_due_date: input.dueDate,
    p_description: input.description ?? undefined,
  });
  if (error) return err(toErrorCode(error));
  return ok({ issued: data });
}

export async function recordPayment(
  client: TadrissClient,
  input: PaymentInput,
): Promise<Result<{ paymentId: string; receiptNumber: string }>> {
  const { data, error } = await client.rpc('record_payment', {
    p_invoice_id: input.invoiceId,
    p_amount_centimes: input.amount,
    p_method: input.method,
    p_paid_on: input.paidOn,
    p_reference: input.reference ?? undefined,
  });
  if (error) return err(toErrorCode(error));
  const row = data[0];
  return row
    ? ok({ paymentId: row.payment_id, receiptNumber: row.receipt_number })
    : err('unknown');
}

export async function voidPayment(client: TadrissClient, input: VoidInput): Promise<Result<null>> {
  const { data, error } = await client
    .from('payments')
    .update({ voided_at: new Date().toISOString(), void_reason: input.reason })
    .eq('id', input.id)
    .is('voided_at', null)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

export async function voidInvoice(client: TadrissClient, input: VoidInput): Promise<Result<null>> {
  const { data, error } = await client
    .from('invoices')
    .update({ voided_at: new Date().toISOString(), void_reason: input.reason })
    .eq('id', input.id)
    .is('voided_at', null)
    .select('id');
  if (error) return err(toErrorCode(error));
  return data.length > 0 ? ok(null) : err('not_found');
}

// ── receipts ────────────────────────────────────────────────────────────────

export type ReceiptView = {
  receiptNumber: string;
  paidOn: string;
  amountCentimes: number;
  method: PaymentMethod;
  reference: string | null;
  voided: boolean;
  voidReason: string | null;
  invoiceNumber: string;
  invoiceDescription: string;
  invoiceAmountCentimes: number;
  /** What is still owed on the invoice right now. */
  balanceCentimes: number;
  studentName: string;
  institutionName: string;
};

/** Everything a printed receipt shows. RLS limits it to the administration and the paying student. */
export async function getReceipt(
  client: TadrissClient,
  paymentId: string,
): Promise<Result<ReceiptView>> {
  const { data: p, error } = await client
    .from('payments')
    .select(
      'id, invoice_id, institution_id, student_id, receipt_number, amount_centimes, method, paid_on, reference, voided_at, void_reason',
    )
    .eq('id', paymentId)
    .maybeSingle();
  if (error) return err(toErrorCode(error));
  if (!p) return err('not_found');

  const [invoice, student, school] = await Promise.all([
    client.from('invoice_balances').select(BALANCE_COLUMNS).eq('id', p.invoice_id).maybeSingle(),
    client.from('profiles').select('first_name, last_name').eq('id', p.student_id).maybeSingle(),
    client.from('institutions').select('name').eq('id', p.institution_id).maybeSingle(),
  ]);
  if (invoice.error) return err(toErrorCode(invoice.error));
  if (student.error) return err(toErrorCode(student.error));
  if (school.error) return err(toErrorCode(school.error));
  if (!invoice.data || !isComplete(invoice.data) || !student.data || !school.data)
    return err('not_found');

  return ok({
    receiptNumber: p.receipt_number,
    paidOn: p.paid_on,
    amountCentimes: p.amount_centimes,
    method: p.method as PaymentMethod,
    reference: p.reference,
    voided: p.voided_at !== null,
    voidReason: p.void_reason,
    invoiceNumber: invoice.data.number,
    invoiceDescription: invoice.data.description,
    invoiceAmountCentimes: invoice.data.amount_centimes,
    balanceCentimes: invoice.data.balance_centimes,
    studentName: `${student.data.first_name} ${student.data.last_name}`,
    institutionName: school.data.name,
  });
}
