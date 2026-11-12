# Device-dependent no-times incident

Owner reported a small basket (stir-crispy x1, stir-pepper/chicken x1, jasmine-rice x2) showing no times on customer iPad and Sam's phone around 18:45; owner's laptop and phone worked. Owner confirmed Sam refreshing Safari restored times. Both order types were reported affected and another customer subsequently ordered. Refresh recovery suggests stale page state; original client request/response was not captured, so the original incident root cause remains unconfirmed.

Read-only order inspection confirmed RTK-1625 contains the reported basket. No customer PII collected. Supabase function logs returned successful HTTP calls during the incident, without an attributable request or decision payload. A direct availability probe was rejected at Cloudflare with 403/1010; no attempt to bypass it. No production financial, scheduler or database writes.

Confirmed independent defect: reopening checkout requested availability using the previously selected delivery mode, then silently selected collection afterward. A regression against production source fails with actual request mode delivery while displayed mode collection; the fix selects collection before assessing. Adds Refresh times, safe valid-selection preservation, Safari back-forward-cache refresh while checkout is open, and no-store availability fetches. Versions the checkout client script reference.

17 tests pass: three new availability/UI-state tests plus 14 existing booking-client tests. The mode-mismatch test fails against original production source and passes with this fix. Does not establish that this defect explains both reported device failures. Production deployment pending owner approval; rollback to main 2781eae preserves all financial and scheduling data.
