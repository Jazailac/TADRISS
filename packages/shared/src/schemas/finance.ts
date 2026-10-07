import { z } from 'zod';
import { isIsoDate } from '../dates';
import { parseMoney } from '../money';

export const MAX_AMOUNT_CENTIMES = 100_000_000; // 1 000 000 MAD, the database limit

/** An amount typed by a person ("1 250,50", "1250.5") → integer centimes, between 0,01 and 1 000 000 MAD. */
const amount = z
  .string()
  .transform((v, ctx) => {
    const c = parseMoney(v);
    if (c === null) {
      ctx.addIssue({ code: 'custom', message: 'invalidAmount' });
      return z.NEVER;
    }
    return c;
  })
  .refine((c) => c >= 1 && c <= MAX_AMOUNT_CENTIMES, { error: 'invalidAmount' });

const description = z.string().trim().min(1, { error: 'required' }).max(200, { error: 'tooLong' });
const dueDate = z.string().refine(isIsoDate, { error: 'invalidDate' });

export const paymentMethods = ['cash', 'transfer', 'cheque', 'card'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const feePlanInput = z.object({
  name: z.string().trim().min(1, { error: 'required' }).max(100, { error: 'tooLong' }),
  description: z
    .string()
    .trim()
    .max(500, { error: 'tooLong' })
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  amount,
});
export type FeePlanInput = z.infer<typeof feePlanInput>;

export const updateFeePlanInput = feePlanInput
  .omit({ amount: true })
  .extend({ id: z.uuid({ error: 'required' }) });
export type UpdateFeePlanInput = z.infer<typeof updateFeePlanInput>;

export const invoiceInput = z.object({
  studentId: z.uuid({ error: 'required' }),
  description,
  amount,
  dueDate,
});
export type InvoiceInput = z.infer<typeof invoiceInput>;

export const generateInvoicesInput = z.object({
  feePlanId: z.uuid({ error: 'required' }),
  classId: z.uuid({ error: 'required' }),
  dueDate,
  description: z
    .string()
    .trim()
    .max(200, { error: 'tooLong' })
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});
export type GenerateInvoicesInput = z.infer<typeof generateInvoicesInput>;

export const paymentInput = z.object({
  invoiceId: z.uuid({ error: 'required' }),
  amount,
  method: z.enum(paymentMethods, { error: 'required' }),
  paidOn: z.string().refine(isIsoDate, { error: 'invalidDate' }),
  reference: z
    .string()
    .trim()
    .max(100, { error: 'tooLong' })
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});
export type PaymentInput = z.infer<typeof paymentInput>;

/** Voiding always needs a reason: it is the audit trail. */
export const voidInput = z.object({
  id: z.uuid({ error: 'required' }),
  reason: z.string().trim().min(1, { error: 'required' }).max(300, { error: 'tooLong' }),
});
export type VoidInput = z.infer<typeof voidInput>;
