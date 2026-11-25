# Legacy kitchen schedule extraction

Base: 636c6ebacdc5085bea93ee1a8beccd9981f00f60.

Four unchanged function bodies move to customer-legacy-kitchen-schedule.js: effective order time, existing order load, date-specific schedule query, and production-map construction. The factory receives the existing Supabase client, window reference and allocator wrappers. Checkout retains shared capacity-map ownership, refresh orchestration, eligibility and all existing callsites. Registration and factory creation perform no I/O.

The original status/time precedence, query columns and date filters, is_test exclusion, RTKBookingCapacityRows delegation, fetch-error empty-array fallback, sorting, forced reservation and conflict warnings are retained. No scheduling policy, Master Wok, fee, payment, database schema, feature flag or notification changes.

Validation: 231 tests pass, no skips/failures. New tests cover 20 status/time combinations, numeric and missing load values, query/filter/date preservation and failed fetches, and actual allocator integration on empty, occupied, pending and zero-load orders. A source proof reconstructs the entire released checkout bootstrap byte for byte, chained into prior extraction proofs. Classic script loading and browser fixture include the new module synchronously before checkout. Whitespace and syntax checks pass. Hosted startup verification is recorded in the PR.
