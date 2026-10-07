# 0014 — Finance rules (answers to ADR 0004's open questions)

- Status: Proposed (engineering defaults so Phase 8 could ship; the product owner should confirm or change them)
- Date: 2026-10-07

## Decision

1. **Allocation:** a payment is recorded against one specific invoice. There is no automatic spreading of a
   payment over several invoices.
2. **Overpayment:** refused. A payment cannot exceed the invoice's remaining balance (checked in a trigger
   under a row lock, so concurrent payments cannot both pass).
3. **Discounts / late fees:** none yet. A discount is a smaller custom invoice or its own fee plan.
4. **Numbering:** invoices `F-YYYY-NNNN` and receipts `R-YYYY-NNNN`, per school and per calendar year (in the
   school's time zone), gapless: assigned by a trigger from a counter updated in the same transaction. A
   voided document keeps its number.
5. **Corrections:** amounts are immutable. An invoice or payment is *voided* with a reason and re-issued. A
   void is final; an invoice with live payments cannot be voided.
6. **Visibility:** only the administration creates or voids anything. A student sees their own non-void
   invoices and payments (and can print their receipts). Teachers see no financial data.

## Consequences

- Currency is MAD only, in integer centimes (ADR 0004).
- Statuses (unpaid / partial / paid / overdue) are derived from the `invoice_balances` view, never stored.
- If the owner wants credit balances, late fees or sibling discounts, they extend this model rather than
  change it: add columns/tables and relax the overpayment trigger.
