# Master Wok checkout integration — review only

Do not deploy to production without explicit approval of the complete release.
Production main and its checkout remain unchanged.

The existing form asks the backend for an explicit booking mode before writing.
LEGACY retains the original checkout. MASTER_WOK posts one basket request with a
stable retry key. Unknown mode/outcome fails closed; an uncertain attempt cannot
become a second legacy order after rollback. No new chef interaction is added.

Preview functions require RTK_ORDER_BACKEND_URL explicitly configured to staging;
without it they refuse requests. RTK_PROXY_SECRET remains server-side. Never point
a preview at production for testing. The UI uses existing availability hints until
the release runtime supplies the combined assessor's availability contract.

Required release order (not authorization to deploy):

1. Review/apply order receipts, time-response receipts, service plans, notification
   outbox and capacity_scheduler SQL from the core review branch in staging first.
2. Install the authoritative booking runtime, trusted delivery lookup, notification
   dispatcher, service controls and durable launch control. Rehearsal wrappers are
   explicitly unsuitable for production approval.
3. Deploy backend routes with LEGACY mode, then this website to a staging preview.
4. Rehearse the hosted checkout/lifecycle/notification chain, REST write fencing,
   writer drain, pre-service plan seeding and deployed rollback.
5. Obtain explicit approval for the exact production release before production DDL,
   checkout deployment or mode changes.

Rollback preserves schema and committed orders. The capacity reader reserves both
pending proposal times for tagged Master Wok orders, including cross-date moves.
Unknown previous checkout attempts retain their key and block a duplicate order.
Local compatibility tests pass; deployed rollback is still a release gate.

Validation: ten client/proxy tests; mobile Chromium checkout in both modes; actual
browser JSON passed into the private staging database through a controlled test
bridge. Maps, loyalty read providers and notification sends were isolated. This
evidence does not certify the deployed Cloudflare/Railway transport or delivery.

Follow-up: the browser test can run the actual Pages functions locally against a
deployed staging backend via MW_TEST_HOSTED_CONFIG (private temporary JSON; never
commit credentials). This passed through Railway and Supabase with one GBP9 order.
The public mode check now permits the server's cold-start budget before failing
closed. Hosted Cloudflare preview build succeeded but redirects to Access login;
its actual environment configuration and full browser chain are not certified.

The existing picker now requests basket-specific availability in MASTER_WOK mode;
LEGACY retains the old scheduler. Hints never create a booking or pending key,
failed/incomplete responses disable time selection, and a mode change requires
refreshing times. Checkout always reassesses atomically. Twelve client/proxy cases
and mobile checks for both modes/availability failure pass. Actual local Pages
functions -> deployed Railway -> private Supabase availability and checkout pass;
Cloudflare-hosted access/configuration remains unverified.

Admin follow-up (1 November): existing status dropdown uses the authenticated
/admin-api/order-action gateway in Master Wok mode, including atomic completion
and loyalty. Legacy direct status/settlement behavior is retained only after an
explicit LEGACY mode response. Missing/unknown mode fails closed. Lifecycle
responses mark notification ownership so accept/decline/suggest do not send a
second browser notification. Eighteen admin/client/proxy tests pass; all three
admin inline scripts parse. This does not certify the hosted /admin-api route.

The core review includes sql/booking-write-fence.sql, tested in private staging
with the exact SQL and real anon/authenticated/service_role roles (49 joined
scenario groups). It must be included in the approved staging/production release
plan; no production SQL has been applied. Deploy both updated lifecycle response
and admin client together before enabling Master Wok.

Preview isolation: checkout hints/submission and admin mutations now refuse
LEGACY mode on Pages/GitHub preview hostnames, preventing the retained live legacy
Supabase path from being exercised during staging. The guard allows production
hostnames and local test hosts. Twenty admin/client/proxy tests pass. Staging
backend remains deliberately LEGACY until the controlled rehearsal is ready.

Hosted mode-check failure diagnosed: Workers rejects redirect:'error' before any
upstream request is sent. All three Pages proxies now use redirect:'manual' and
explicitly refuse every 3xx response without forwarding Location. Cloudflare's
actual local workerd runtime (Miniflare 4.20260730.0) reproduces the original
TypeError and passes real HTTP upstream requests plus redirect rejection for mode,
booking and availability. Run tests/booking-worker-runtime.cjs as documented in
its header. Twenty-one admin/client/proxy tests also pass. The hosted response
still needs rechecking after this preview-only deployment.

Admin rehearsal: both existing admin proxies now honor RTK_ORDER_BACKEND_URL,
refuse implicit production routing on Preview, keep the proxy secret server-side,
and reject redirects. Preview's existing admin screen loads only the private
rehearsal order list through the authenticated gateway; production keeps its
existing Supabase reader. The temporary staging wrapper limits reads/mutations to
this run's receipt prefix and fixture email, while reusing createBookingRuntime
and the existing lifecycle/assessment modules. No dashboard is added. Twenty-three
client/admin/proxy tests and real workerd checks for all five proxies pass.
Hosted admin UI and customer-response checks are recorded separately in the core
review branch; these changes do not authorize production deployment.
