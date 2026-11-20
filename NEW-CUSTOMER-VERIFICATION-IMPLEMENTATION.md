# New customer verification — implementation plan (Issue #93)

Status: development branch; NOT deployed.

## Existing architecture verified
- `admin.html` loads `customer-review-flags-admin.js` to annotate order rows.
- `functions/admin-api/customer-review-flags.js` verifies signed Cloudflare Access, staff email allowlist, same-origin requests and private proxy credentials.
- Backend `/admin-customer-review-flags` is on Railway, separate from this website repository.
- Existing no-show matching must remain unchanged and higher priority than new-customer advice.

## Build sequence
1. Identify the Railway backend source repository and inspect existing order schema/status lifecycle before changing SQL. Do not assume cancelled/test statuses or time fields.
2. Add a *private* batch lookup for prior completed orders as-of the current order's creation timestamp. Compare customer ID and normalized phone/email, never name-only as proof. Distinguish definite first-time, probable returning, uncertain and lookup-unavailable. Historical first orders retain their original classification after completion.
3. Create a staff-only, per-order contact-status table and append-only audit records (contact recommended, contacted, unable to reach, not required). Store actor and timestamp server-side. Require the existing Cloudflare Access staff identity and private backend secrets for all writes. Never accept arbitrary browser-supplied actor.
4. Add the Admin indicator and contact controls without modifying order acceptance, kitchen scheduling, receipt printing or customer-facing payloads. Ensure no-show warnings remain clearly visible.
5. Add SQL, backend auth and UI regression tests. Test first-order history, same contact on different customer IDs, cancellations, test orders, blank details, shared numbers, time ordering, retries and audit trail.
6. Verify on staging; require explicit approval before any production deployment.

## Safety decisions
- Contact is optional; never block cooking.
- A failed history lookup must display 'Verification unavailable', not claim NEW CUSTOMER.
- 'Unable to reach' is an attempt, not proof of a bad customer.
- Do not infer fraud from a new-customer classification.

## Staging verification — 19 November 2026
- Both isolated GitHub Actions workflows showed successful completion in the operator's GitHub screenshots (website 22 seconds; backend 15 seconds).
- Executed a **read-only synthetic seven-scenario SQL classification query** on the Master Wok staging PostgreSQL project. All seven classifications matched expectations: first order, returning customer, shared phone, unique contact, earlier test order, earlier cancelled order, and missing contact keys.
- This was **not execution of the deployed RPC** and **not an end-to-end Admin test**. Master Wok staging does not contain the production customers table or the production orders.customer_id field. No migrations were applied.
- Read-only inspection of production orders schema confirmed `status`, `created_at`, `paid_at`, but **no completion timestamp**. A past order currently marked completed may have completed after a later order was created. Therefore the current lookup cannot establish "completed as of order creation" with certainty; this is a release blocker for that exact historical claim. Do not present historical classification as audited as-of-order truth until an appropriate completion event source is established or the product requirement is explicitly revised.
- Before deployment: representative isolated database integration for both RPCs and audit transaction, authenticated proxy/UI end-to-end tests, and confirmation of historical completion semantics.

## Read-only production data compatibility — 19 November 2026
- Verified that production has `staff_review_phone_key(text)`, but neither of the new RPCs nor the new contact table is installed. Master Wok staging lacks all four objects, as expected.
- Ran the proposed classification SELECT directly against production orders from the preceding 30 days, **without invoking or installing the RPC** and returning **aggregate counts only**. Results: 34 new, 8 possibly new, 59 returning (101 orders total).
- Counts are provisional, not independently verified identities or completion-at-order-time evidence. Do not use this query as a substitute for integration testing of the actual functions, protected endpoints, or Admin contact audit.
- Production database and Master Wok staging database remained unchanged.

## Isolated contact-function rejection tests — 20 November 2026
- Executed a schema-adjusted copy of the contact-recording PL/pgSQL function in a transaction-only staging schema, using synthetic orders.
- Confirmed invalid status -> INVALID_CONTACT_UPDATE, nonexistent order -> ORDER_NOT_FOUND, malformed staff actor -> INVALID_CONTACT_UPDATE.
- After all three rejected calls, current-status rows = 0 and audit rows = 0. Transaction rolled back; verified temporary schema absent.
- This validates function-level rejection behavior, not production grants, Cloudflare Access authentication, or complete Admin end-to-end flow.

## Isolated database privilege test — 20 November 2026
- Created a synthetic audit table in an isolated staging schema within a rolled-back transaction and applied the intended privilege pattern.
- PostgreSQL has_table_privilege checks: anon SELECT=false, authenticated INSERT=false, service_role INSERT=true, service_role UPDATE=false, service_role DELETE=false.
- This checks grants on a representative table, not the complete production feature's function grants, RLS policies, or Cloudflare/Flask authorization. Do not describe as complete security sign-off.

## Exact contact migration privilege checks — 20 November 2026
Executed the current sql/new-customer-contact-audit.sql in a temporary staging schema, replacing only the schema qualifier and adding a synthetic orders table, inside BEGIN/ROLLBACK. Verified 10 results: anon EXECUTE false, authenticated EXECUTE false, service_role EXECUTE true; anon status SELECT false, authenticated audit SELECT false; service_role audit INSERT true, UPDATE false, DELETE false; RLS enabled on both contact tables. This does not validate complete Cloudflare/Flask integration or real production RLS behavior. No permanent schema changes.
