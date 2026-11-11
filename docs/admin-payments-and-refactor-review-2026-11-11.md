# Admin payments and website refactor: implementation review

Reviewed 11 November 2026. Inspection only; production code, database and service configuration unchanged.

## Exact sources

| Component | Source |
|---|---|
| Website production baseline | `d5b20f7eb29a76de68299ecad1a96a2272cc1586` |
| Existing payment POC | `feature/payment-capture-complete` at `e885acf181fbe360b6700280d5272ed272b5fbd3` |
| Existing design refactor | `refactor-mvp-v2` at `fd2de0e86421871b203be1be0bae692d4b7bc71d` |
| Backend production baseline | `fee04f72163af9aff8b63143749c52fcfa3911e8` |
| Master Wok live release | `master-wok-four-ring-2026-11-10`, runtime digest `56a47189fd294172aac671b77a65dff12ef78aa5ceca46416b40f4e0e396c80d` |

## What already exists

Payment POC is 18 commits ahead of its common ancestor and 43 commits behind current production. It includes a non-saving Admin dialog; bill/tip methods and amounts; schema/audit draft; retry/legacy-state contracts; isolated money validation. Its twenty existing validation tests pass on re-run. There is no implemented saving endpoint or database transaction in that branch. These tests do not prove persistence, concurrency or browser integration.

The POC replaces Mark paid with a preview and labels its proposed action Save payment & complete. Do not merge that behaviour: current Master Wok deliberately separates `mark_paid` (paid/payment_status/paid_at) from `complete` (status completed and loyalty settlement).

Design refactor is 28 commits ahead of its common ancestor and 108 behind production. It contains hero video/assets, revised menu cards, inline ordering, customise refinements, allergen icons and item instructions. Neither index file contains Master Wok integration. Both still include direct orders/order_items inserts. They must not replace production checkout.

Current Master Wok lifecycle already supports `set_test` through the common booking transaction, service-date locks and plan reassessment. Admin currently lacks the control. Direct Supabase edits are correctly blocked by the write fence.

## First release: record payment and tips

Finish the existing components on a fresh branch from production; retain the old POC as a reference. Initial scope is one full bill payment, with separately recorded optional tip and its method. Reuse existing supported cash/card/bank-transfer values; card bill with cash tip is valid.

- Mark paid records payment only. Keep Completed as a distinct action. A future combined action must be explicit.
- Derive amount due from the stored final order total, after discounts/delivery. Tips stay outside food/delivery revenue and loyalty.
- Display recorded payment amounts/methods and tip in Admin and receipts/export.
- Capture and corrections require signed staff identity, not a client-supplied actor.
- Lock the order within the established authoritative writer transaction. Persist payment, append audit event, update paid fields and return a durable idempotent receipt together.
- Preserve started capacity work and the Master Wok fence. Avoid separate browser mark_paid/complete/database calls.
- Preserve legacy paid orders as method unknown; do not fabricate historical tips/methods.
- Corrections retain old/new values and require a reason. Keep original commercial order value separate from any discretionary adjustment.
- Defer partial/split bill payments and refunds from the first release; they were not part of the existing POC.

Required checks: exact same-key replay; changed-payload refusal; simultaneous different-key capture; failure midway leaves no payment/event/status change; signed/forged staff boundary; already-completed unpaid order does not settle loyalty again; legacy paid state; cancelled-order policy; card bill/cash tip; zero tip; normal existing completion still works.

## Small companion change: safe test marking

Expose the existing server action in Admin, with confirmation and refreshed authoritative state. Begin with cancelled orders to meet the immediate clean-view need. No browser database update and no disabling of write-fence triggers. Verify no plan reservation is revived, no new notification is sent, and cancelled status/history remain intact.

## Order amendment release

Extend the existing lifecycle writer rather than introducing a separate editing writer. Preview changes before saving; reassess again under the common lock on commit.

- Change collection/delivery plus required address, delivery eligibility/fee, driver plan and front-door promise.
- Change date/time, preserving customer acknowledgement for a proposed change.
- Add/remove items, quantities, proteins/extras/spice and per-item instructions, using current server pricing/allergen rules.
- Show revised total and additional amount due/refund requirement before committing; do not silently rewrite a previously recorded payment.
- Replan all affected dates and existing commitments, preserve started work, append staff/reason/before-after audit, and enqueue one relevant customer notification.
- Refuse stale order revisions and capacity conflicts. Test alterations after payment and completed/cancelled-order restrictions explicitly.

## Website launch, independently of order amendment

Port the visual/menu improvements onto current production code, retaining the live checkout boundary, Master Wok hints/atomic booking/retries, review returns/holding consent, delivery quotes, SMS default, discounts/loyalty, blackouts and current menu/allergen changes. Do not merge the old index wholesale.

Prepare a preview with the production-equivalent integration, then verify desktop/mobile basket/customise flow, item instructions/allergens, collection/delivery, failed/retried checkout, review links, receipt, blackouts and accessibility. Check hero-video loading/mobile behaviour. Release the design independently once those checks pass; it does not need to wait for order amendments.

## Remaining decisions

No business decision blocks implementation of the first full-payment recording release. Confirm any expanded partial/split-payment or refund behaviour before adding it. Production deployment of new code/schema remains a separate approval.
