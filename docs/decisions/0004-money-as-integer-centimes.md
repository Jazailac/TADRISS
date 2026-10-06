# 0004 — Money is stored as integer centimes

- Status: Proposed (engineering default; money _rules_ are still open, see below)
- Date: 2026-10-06

## Context

Floating-point amounts accumulate rounding error; finance data must reconcile exactly.

## Decision

All amounts are `bigint` centimes (1 MAD = 100 centimes) in Postgres and `number` integers in
TypeScript (safe up to 9×10¹³ MAD). Conversion happens only for display (`formatMoney`) and
input (`parseMoney`) in `@tadriss/shared`. Currency is fixed to MAD.

## Open questions for the product owner (block Phase 8)

1. Allocation of partial payments across invoices (oldest first?).
2. Overpayments: credit balance or refused?
3. Late fees / discounts / sibling discounts?
4. Receipt numbering: per institution per year (`2026-000123`)? Gapless even with voids?
