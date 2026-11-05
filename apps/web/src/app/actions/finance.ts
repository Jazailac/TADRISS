'use server';

import {
  createFeePlan,
  createInvoice,
  err,
  feePlanInput,
  fieldErrors,
  generateInvoices,
  generateInvoicesInput,
  invoiceInput,
  listPeople,
  paymentInput,
  recordPayment,
  setFeePlanArchived,
  updateFeePlan,
  updateFeePlanInput,
  voidInput,
  voidInvoice,
  voidPayment,
  type Result,
} from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from '@/lib/form-state';
import { requireAdmin } from '@/lib/require-admin';

const echo = (fd: FormData, names: string[]) =>
  Object.fromEntries(
    names.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );
const pick = (fd: FormData, names: string[]) =>
  Object.fromEntries(names.map((n) => [n, fd.get(n)]));

const refresh = () => {
  revalidatePath('/[locale]/dashboard/finance', 'page');
  revalidatePath('/[locale]/dashboard/finance/[id]', 'page');
  revalidatePath('/[locale]/student/payments', 'page');
};

export async function createFeePlanAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const names = ['name', 'description', 'amount'];
  const values = echo(fd, names);
  const parsed = feePlanInput.safeParse(pick(fd, names));
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error, values };
  const res = await createFeePlan(admin.data.supabase, admin.data.institutionId, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function updateFeePlanAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const names = ['id', 'name', 'description'];
  const values = echo(fd, names);
  const parsed = updateFeePlanInput.safeParse(pick(fd, names));
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error, values };
  const res = await updateFeePlan(admin.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function archiveFeePlanAction(id: string, archived: boolean): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return err('validation');
  const admin = await requireAdmin();
  if (!admin.ok) return admin;
  const res = await setFeePlanArchived(admin.data.supabase, id, archived);
  if (res.ok) refresh();
  return res;
}

export async function createInvoiceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const names = ['studentId', 'description', 'amount', 'dueDate'];
  const values = echo(fd, names);
  const parsed = invoiceInput.safeParse(pick(fd, names));
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error, values };
  const res = await createInvoice(admin.data.supabase, admin.data.institutionId, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true, values: { id: res.data.id } };
}

export async function generateInvoicesAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const names = ['feePlanId', 'classId', 'dueDate', 'description'];
  const values = echo(fd, names);
  const parsed = generateInvoicesInput.safeParse(pick(fd, names));
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error, values };
  const res = await generateInvoices(admin.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true, values: { issued: String(res.data.issued) } };
}

export async function recordPaymentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const names = ['invoiceId', 'amount', 'method', 'paidOn', 'reference'];
  const values = echo(fd, names);
  const parsed = paymentInput.safeParse(pick(fd, names));
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error, values };
  const res = await recordPayment(admin.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true, values: { receipt: res.data.receiptNumber, paymentId: res.data.paymentId } };
}

export async function voidPaymentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, ['id', 'reason']);
  const parsed = voidInput.safeParse(pick(fd, ['id', 'reason']));
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error, values };
  const res = await voidPayment(admin.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export async function voidInvoiceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, ['id', 'reason']);
  const parsed = voidInput.safeParse(pick(fd, ['id', 'reason']));
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error, values };
  const res = await voidInvoice(admin.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

export type StudentMatch = { id: string; name: string; email: string | null };

/** Type-ahead for the invoice form: active students whose name or email matches. */
export async function searchStudentsAction(q: string): Promise<Result<StudentMatch[]>> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin;
  const res = await listPeople(admin.data.supabase, {
    role: 'student',
    status: 'active',
    q: q.slice(0, 80),
    pageSize: 8,
  });
  if (!res.ok) return res;
  return {
    ok: true,
    data: res.data.rows.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
    })),
  };
}
