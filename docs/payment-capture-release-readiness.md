# Payment capture — release-readiness review (22 October 2026)

**Scope:** Feature branch only. No Railway source access and no live DB changes. This is a code review, not an end-to-end verification.

## Confirmed from current Admin code
- The Admin displays a friendly `order_ref`, with a UUID-derived fallback.
- The Admin computes `finalTotal` from stored `orders.total` where available, otherwise from subtotal, discount and delivery. The payment preview now receives the same `finalTotal` as the displayed table rather than a separate expression.
- The existing `complete` button sends `{action:'complete', orderId}` through `/admin-api/order-action` and reloads on success. It remains available in the feature branch.
- The new `Mark paid` UI is preview-only: no saving or status changes.
- The Admin currently does not reference `payment_status` or `paid_at` in its visible script, so payment state display and button rules still need implementation.

## Issues to resolve before launch
1. **Authoritative amount:** The browser's `finalTotal` is display-only. Railway must use the stored final total and reject mismatches. Investigate existing `Number(null) === 0` behaviour in the Admin total fallback before relying on it.
2. **Order state:** Read Railway's `mark_paid` and `complete` implementations to identify all completion fields and side effects. Do not replace the old action blindly.
3. **Existing payments:** Determine how to handle `paid=true` / `payment_status='paid'` orders with no new `order_payments` record. Never fabricate historical payment methods or tips.
4. **Already completed, unpaid:** Allow legitimate payment capture without re-running completion side effects, subject to backend state rules.
5. **Corrections:** Implement an explicit permissioned correction flow with mandatory reason and audit event. Never silently overwrite a previous capture.
6. **Concurrency/idempotency:** Use a trusted atomic transaction and persistent request keys; verify concurrent and retried requests.
7. **UI:** Show recorded payment method, tip and amount when available; hide or relabel Mark paid for paid orders; preserve completion-only workflow for unpaid exceptions.
8. **Staff identity:** Record a verified backend actor rather than trusting arbitrary browser-provided text.
9. **Validation:** Client validation is convenience only; the server must revalidate against current order data.
10. **Testing:** Existing GitHub Actions covers isolated input-validation unit tests, not the Admin browser UI, DB migration or Railway integration.

## Suggested release gate
- [ ] Railway source reviewed and canonical status semantics documented
- [ ] Migration tested on staging with RLS/privilege checks
- [ ] Atomic capture and correction actions implemented
- [ ] Browser UI save enabled only behind a feature flag
- [ ] End-to-end tests P01–P15 passed on staging
- [ ] Legacy paid-order behaviour verified
- [ ] Rollback and reconciliation procedures confirmed
- [ ] Production rollout explicitly approved
