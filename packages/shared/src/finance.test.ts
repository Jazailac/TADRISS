import { describe, expect, it } from 'vitest';
import { invoiceStatus, summariseOverdue } from './finance';
import { centimesToInput, parseMoney } from './money';
import { toErrorCode } from './result';
import {
  feePlanInput,
  generateInvoicesInput,
  invoiceInput,
  paymentInput,
  voidInput,
} from './schemas/finance';

const id = () => crypto.randomUUID();

describe('money input', () => {
  it.each([
    ['1200', 120000],
    ['1 250,50', 125050],
    ['1250.5', 125050],
    ['0,01', 1],
    ['350 MAD', 35000],
    ['350 DH', 35000],
  ])('reads %s as %s centimes', (input, centimes) => {
    expect(parseMoney(input)).toBe(centimes);
  });
  it('round-trips through the editable form', () => {
    expect(centimesToInput(125050)).toBe('1250.50');
    expect(parseMoney(centimesToInput(125050))).toBe(125050);
    expect(parseMoney(centimesToInput(1))).toBe(1);
  });
});

describe('amount fields', () => {
  const inv = (amount: string) =>
    invoiceInput.safeParse({
      studentId: id(),
      description: 'Scolarité',
      amount,
      dueDate: '2026-10-05',
    });
  it('turns an amount into integer centimes', () => {
    const r = inv('1 200,50');
    expect(r.success && r.data.amount).toBe(120050);
  });
  it.each(['', 'abc', '0', '0,00', '-5', '1000000,01', '12,345'])('rejects %s', (amount) => {
    const r = inv(amount);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('invalidAmount');
  });
  it('accepts exactly one million dirhams (the database limit) and one centime', () => {
    expect(inv('1000000').success).toBe(true);
    expect(inv('0,01').success).toBe(true);
  });
});

describe('finance inputs', () => {
  it('a fee plan trims and nulls a blank description', () => {
    const r = feePlanInput.safeParse({ name: ' Scolarité ', description: '', amount: '1200' });
    expect(r.success && r.data).toMatchObject({
      name: 'Scolarité',
      description: null,
      amount: 120000,
    });
  });
  it('generate_invoices needs plan, class and a real date', () => {
    expect(
      generateInvoicesInput.safeParse({ feePlanId: id(), classId: id(), dueDate: '2026-10-05' })
        .success,
    ).toBe(true);
    expect(
      generateInvoicesInput.safeParse({ feePlanId: id(), classId: id(), dueDate: '2026-13-05' })
        .success,
    ).toBe(false);
  });
  it('a payment needs a known method and a real date', () => {
    const base = {
      invoiceId: id(),
      amount: '500',
      method: 'cash',
      paidOn: '2026-10-05',
      reference: '  VIR-1 ',
    };
    const r = paymentInput.safeParse(base);
    expect(r.success && r.data).toMatchObject({ amount: 50000, reference: 'VIR-1' });
    expect(paymentInput.safeParse({ ...base, method: 'bitcoin' }).success).toBe(false);
    expect(paymentInput.safeParse({ ...base, paidOn: 'hier' }).success).toBe(false);
  });
  it('a void always needs a reason', () => {
    expect(voidInput.safeParse({ id: id(), reason: '   ' }).success).toBe(false);
    expect(voidInput.safeParse({ id: id(), reason: 'Saisie en double' }).success).toBe(true);
  });
});

describe('invoiceStatus', () => {
  const base = { voided: false, amountCentimes: 100000, paidCentimes: 0, dueDate: '2026-10-10' };
  const today = '2026-10-07';
  it('is unpaid before the due date', () => {
    expect(invoiceStatus(base, today)).toBe('unpaid');
  });
  it('is partial when something was paid and it is not yet due', () => {
    expect(invoiceStatus({ ...base, paidCentimes: 40000 }, today)).toBe('partial');
  });
  it('is paid once fully paid, even after the due date', () => {
    expect(invoiceStatus({ ...base, paidCentimes: 100000 }, today)).toBe('paid');
    expect(invoiceStatus({ ...base, paidCentimes: 100000, dueDate: '2026-01-01' }, today)).toBe(
      'paid',
    );
  });
  it('is overdue the day after the due date, partly paid or not', () => {
    expect(invoiceStatus({ ...base, dueDate: '2026-10-06' }, today)).toBe('overdue');
    expect(invoiceStatus({ ...base, dueDate: '2026-10-06', paidCentimes: 1 }, today)).toBe(
      'overdue',
    );
  });
  it('is not overdue ON the due date', () => {
    expect(invoiceStatus({ ...base, dueDate: today }, today)).toBe('unpaid');
  });
  it('void beats everything', () => {
    expect(
      invoiceStatus({ ...base, voided: true, paidCentimes: 100000, dueDate: '2026-01-01' }, today),
    ).toBe('void');
  });
});

describe('toErrorCode (finance)', () => {
  it('maps the trigger exceptions', () => {
    expect(toErrorCode({ code: 'P0001', message: 'payment_exceeds_balance' })).toBe(
      'payment_exceeds_balance',
    );
    expect(toErrorCode({ code: 'P0001', message: 'invoice_void' })).toBe('invoice_void');
    expect(toErrorCode({ code: 'P0001', message: 'has_payments' })).toBe('has_payments');
    expect(toErrorCode({ code: 'P0001', message: 'cannot_unvoid' })).toBe('conflict');
  });
});

describe('summariseOverdue', () => {
  const names = new Map([
    ['a', { firstName: 'Imane', lastName: 'Alaoui' }],
    ['b', { firstName: 'Omar', lastName: 'Bennani' }],
    ['c', { firstName: 'Sara', lastName: 'Chraibi' }],
  ]);

  it('adds up one student’s invoices and keeps the oldest due date', () => {
    const [imane] = summariseOverdue(
      [
        { studentId: 'a', balanceCentimes: 100, dueDate: '2026-10-05' },
        { studentId: 'a', balanceCentimes: 250, dueDate: '2026-09-05' },
      ],
      names,
    );
    expect(imane).toMatchObject({ balanceCentimes: 350, invoices: 2, oldestDueDate: '2026-09-05' });
  });

  it('puts the largest debt first, and the oldest debt first on a tie', () => {
    const order = summariseOverdue(
      [
        { studentId: 'a', balanceCentimes: 100, dueDate: '2026-10-05' },
        { studentId: 'b', balanceCentimes: 900, dueDate: '2026-10-05' },
        { studentId: 'c', balanceCentimes: 100, dueDate: '2026-09-05' },
      ],
      names,
    ).map((s) => s.firstName);
    expect(order).toEqual(['Omar', 'Sara', 'Imane']);
  });

  it('leaves out a student whose name cannot be read', () => {
    expect(
      summariseOverdue([{ studentId: 'z', balanceCentimes: 1, dueDate: '2026-10-05' }], names),
    ).toEqual([]);
  });
});
