# Legacy payment handling and duplicate-submit safeguards

**Status:** implementation guidance; no Railway handler changes, live DB migration or Admin save activation.

## Classification at Admin load
Use the authoritative order status **and** payment record, not the absence of a new record alone:

| Existing order state | New payment record | Admin behaviour |
|---|---|---|
| Unpaid, not completed | None | Offer Mark paid; capture payment then complete atomically |
| Completed, unpaid | None | Offer Record payment; preserve completion and avoid repeated completion side effects |
| Paid, with captured payment | One | Display recorded methods, amounts, tip; disable new capture; corrections require separate authorised action |
| Paid in legacy fields | None | Display **Paid (legacy — method unknown)**; do not offer ordinary new capture; do not invent payment method or tip |
| Unpaid, with payment record | One | **Inconsistent state**; block new capture and flag for investigation |
| Payment status disagrees with paid flag | Any | **Inconsistent state**; block mutation until backend resolves |
| Cancelled/declined | Any | No ordinary capture; backend eligibility rules determine permitted resolution |

## Legacy reporting
- Preserve the original paid status and final order total.
- Never backfill a made-up payment method, cash tip, payment timestamp or actor.
- If a reconciliation report includes legacy paid orders, show their total in **unknown method / legacy paid** and exclude it from allocated card/cash/bank totals.
- Label historical figures clearly: recorded payments are not necessarily the same as deposits received on the service date.
- Do not assume all historical `paid=true` orders have been received in a particular channel.

## Double-click and network retry
- Disable Save immediately when a valid submission begins; show a saving state and prevent a second in-flight request.
- Generate **one UUID per logical capture attempt** and reuse it on a network retry of that *same payload*. Do not generate a new key for an uncertain outcome.
- After an ambiguous timeout, fetch current payment state before allowing edits. Retry with the same key/payload if supported by the backend.
- Railway must lock the order and enforce one accepted capture, persistent idempotency and payload comparison in a transaction.
- Reusing a key with a different amount/method is an error. A new key for an already-captured payment is a conflict, not a correction.
- On success, refresh authoritative order/payment state. Never claim payment recorded based only on a client-side click.

## Regression scenarios not covered by the pure validator
1. Rapid double-click Save: one request/capture.
2. Two browser tabs submit simultaneously: at most one accepted capture.
3. Timeout after server commit: same-key retry returns prior result without a second event.
4. Timeout before commit: same-key retry safely performs the capture once.
5. Staff changes the payment method while saving: controls locked until resolved.
6. Paid legacy order without payment record: no fabricated method or tip.
7. Completed-but-unpaid order: recording payment does not re-trigger completion effects.
8. Cancelled order: payment capture blocked according to agreed business rules.
9. Unpaid order with an existing payment record: inconsistent state flagged.
10. Audit correction: previous values retained; totals reflect only current effective payment.

**Testing boundary:** these are backend/browser integration cases; the standalone `payment-validation.test.js` cannot prove concurrency, UI click locking or database atomicity.
