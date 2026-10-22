# RTK Daily Takings & Reconciliation Report — specification draft

**Status:** future follow-on feature; design only. Do not implement or deploy until payment capture is live and verified.

## Goal
Print a compact, till-printer-friendly summary for a selected **trading date** (default today, Europe/London). Enable reconciliation of card-reader settlements, physical cash and bank transfers, while keeping tips separate from sales.

## Core calculations
All figures use integer pennies / exact decimal arithmetic.

- **Bill sales received:** sum of bill amounts for successfully recorded payments on the chosen trading date.
- **Tips received:** sum of separately recorded tip amounts.
- **Total received:** bill sales received + tips received.
- **Card takings:** card-paid bills + card-paid tips.
- **Cash takings:** cash-paid bills + cash-paid tips.
- **Bank-transfer takings:** bank-transfer bills + bank-transfer tips.
- **Control check:** card + cash + bank-transfer takings must equal total received.
- **Paid order count:** number of distinct orders represented by captured payments.
- **Completed but unpaid:** list/count of orders marked complete without a recorded payment (must not be treated as received).
- **Exceptions:** legacy paid orders lacking method detail; corrected transactions; unclassified/refunded amounts (if supported later).

The amount due is the stored **final** order total, including delivery and discounts. Never sum menu subtotal as cash received, and never add tips into food sales.

## Date attribution
Decision needed: report by **trading/service date** (preferred for daily cash-up) versus **payment recorded timestamp** (useful for bank settlement). Store/display both where available. The date selector and report must use Europe/London, including daylight-saving transitions. Do not silently mix orders from one service date with payments recorded after midnight.

## Corrections and audit
The report reflects the **latest valid payment state**, not a sum of historical audit events. Audit events provide a correction history, not additional takings. Display corrected orders with an indicator and allow a separate detailed audit printout. Define handling for refunds and reversed payments before introducing them.

## Proposed 80 mm receipt format
- Restaurant name; report title; selected date and generation timestamp
- Paid order count; bill sales; tips; total received
- Card/cash/bank transfer takings, including tips, and control difference
- Order detail: RTK reference, bill amount/method, tip amount/method
- Exceptions section: completed/unpaid, legacy payment method unknown, corrections
- END OF REPORT

**Confirmed hardware:** 80 mm receipt paper (user confirmed). Design the receipt for this roll width, allowing for printer-specific printable margins. Avoid tiny text and excessively wide lines. Reuse the existing Admin ticket-printing mechanism where practical; confirm printer/browser print CSS before coding. Do not assume a direct printer API is available.

## Acceptance checks
| ID | Input | Expected |
|---|---|---|
| R01 | £14.70 card bill + £2 cash tip | Card £14.70; cash £2; sales £14.70; tips £2; total £16.70 |
| R02 | £32 card bill + £3 cash tip | Card £32; cash £3; total £35 |
| R03 | £28.50 cash bill, no tip | Cash £28.50; sales £28.50 |
| R04 | £30 bank transfer | Bank transfer £30 |
| R05 | Order completed but unpaid | Exception only; excluded from received totals |
| R06 | Payment corrected from £2 to £3 cash tip | Latest £3 tip counted once; audit records correction |
| R07 | Legacy paid order without method | Report as unknown method; no invented cash/card allocation |
| R08 | Service crosses midnight / BST change | Correct date grouping under documented rule |
| R09 | Selected date with no payments | All totals £0; no invented orders |
| R10 | Sum of payment methods differs from total | Visible reconciliation exception; not silently hidden |

## Dependencies
1. Final payment schema and correction behaviour.
2. Railway backend payment-capture endpoint and reliable payment records.
3. Read-only authorised reporting endpoint (never expose privileged database keys to browser).
4. Agreement on trading-date attribution; 80 mm printer paper is confirmed.
5. Reconciliation checks against real card-reader settlement and cash count, using authorised test data.

**Release boundary:** Keep this report out of the initial payment-capture release unless explicitly approved later.
