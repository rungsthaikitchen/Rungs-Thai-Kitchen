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
