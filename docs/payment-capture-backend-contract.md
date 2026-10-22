# RTK payment capture & completion — backend contract (draft)

Status: **design only**. Do not deploy until Railway source and existing `complete` / `mark_paid` handlers have been inspected.

## Scope
The Admin UI submits one action to the existing authenticated Cloudflare-to-Railway route, `POST /admin-api/order-action`. Railway must verify the existing proxy secret and staff authorisation. **Never accept client-supplied actor identity as proof of authorisation.** Do not expose a Supabase service-role key in the browser.

Proposed action: `save_payment_and_complete`.

Illustrative payload (actual field names to be aligned with existing backend):
```json
{
  "action": "save_payment_and_complete",
  "orderId": "<order UUID>",
  "billMethod": "card",
  "billAmount": "32.00",
  "tipAmount": "3.00",
  "tipMethod": "cash",
  "idempotencyKey": "<unique request UUID>"
}
```

## Invariants
1. Fetch and lock the order inside one trusted database transaction. Derive the authoritative amount due from the **stored final order total**, including delivery and discounts; never trust the browser's amount. Reject any mismatched `billAmount` pending a separately designed partial-payment flow.
2. Validate allowed payment methods (`card`, `cash`, `bank_transfer`), finite non-negative monetary amounts to two decimal places, tip method present only for positive tips, and order eligible for completion.
3. Insert/update `order_payments`, append `order_payment_events` with trustworthy actor, and set `orders.paid = true`, `payment_status = 'paid'`, `paid_at` plus the **existing backend's canonical completion fields** in the same transaction. Confirm completion semantics from Railway source before implementation.
4. Persist the initial request UUID in `order_payments.capture_idempotency_key` and the corresponding audit request UUID in `order_payment_events.event_idempotency_key`. Repeat submissions with the same idempotency key and identical canonical payload return the original result without new events. Reuse of a key with a different payload is rejected. A different key must not silently overwrite an existing payment; corrections use a distinct, authorised operation with mandatory reason and unique event key.
5. Audit records are append-only in application permissions. Corrections preserve previous and new details and leave completion state unchanged. Payment timestamps should reflect recording time, not be backdated without explicit provenance.
6. For already-completed orders, a legitimate payment may be recorded without re-triggering completion side effects; determine the permitted states after inspecting backend.
7. Any failure rolls back **all** changes. No separate browser calls to `mark_paid` then `complete`.
8. Protect the API against duplicate clicks and concurrent staff edits. Re-read canonical order/payment data after success.
9. Tip amount is separate from food sales and delivery revenue. Reconciliation must distinguish bill method from tip method.

## Before activation
- Review the existing Railway source and authentication mechanism.
- Confirm actor representation and design an explicit transactional DB function or equivalent safe transaction boundary. Idempotency-key persistence is now represented in the schema draft, but transactional enforcement remains to be implemented and tested.
- Decide how refunds, split bill payments, card-reader discrepancies and historical paid orders should be handled (not required for initial launch).
- Confirm how the Admin page renders payment/completion state and which actions remain visible.
- Run staging migration and backend integration tests. Never use production customer orders as test fixtures.

## Acceptance tests
| ID | Given | Action | Expected |
|---|---|---|---|
| P01 | Unpaid, eligible order, total £32 | Card £32, tip £0 | One payment, no tip method, paid and complete |
| P02 | Unpaid, eligible order, total £32 | Card £32, cash tip £3 | Bill card £32, tip cash £3, paid and complete, revenue £32 |
| P03 | Unpaid, eligible order, total £14.70 | Cash £14.70 | Preserve final discounted total £14.70, paid and complete |
| P04 | Unpaid order | Tip £3 without tip method | Validation error; no writes |
| P05 | Unpaid order | Negative tip or >2 decimal places | Validation error; no writes |
| P06 | Unpaid order | Client bill amount differs from stored total | Validation error; no writes |
| P07 | Unpaid order | Same request retried | Idempotent success; one payment/event |
| P08 | Paid order | Different payment request | Conflict; do not overwrite payment |
| P09 | Paid and completed order | Authorised correction with reason | Audit old/new values; completion unchanged |
| P10 | Unpaid order | Database write fails halfway | No payment, no audit event, no status change |
| P11 | Unpaid order | Two staff save simultaneously | At most one accepted capture; no duplicates |
| P12 | Unauthorised request | Submit payment | Rejected; no writes |
| P13 | Existing paid order without new payment row | Open Admin | Display legacy status; don't invent method/tip |
| P14 | Eligible order | Complete without payment via existing button | Existing completion-only behaviour retained |
| P15 | Already completed, unpaid order | Record payment | No repeated completion side effects |

## Release sequence
1. Inspect Railway handler and decide canonical completion semantics.
2. Finalise migration and transaction/idempotency mechanism.
3. Apply to staging, verify RLS and role privileges, run P01–P15.
4. Deploy backend with feature disabled by default.
5. Enable Admin UI save on feature branch, test end to end.
6. Release with rollback procedure and reconciliation checks.
