# Checkout responsibility boundaries

Draft only, continuing PR100. This step starts from the dialog extraction at 6f77a88c87d8871d8ffbe2335f0b2266d1d4a829, whose production baseline is 4fe98474beda7bce04fd7212b40ce335dc3fb93e. The explicit-closure basket review fix is retained. No production, backend or operational settings are changed.

## Responsibilities

- `customer-checkout-dialog.js`: opening/closing, retained choice, loyalty waiting and opening feedback; unchanged from the first draft.
- `customer-checkout-availability.js`: date/time controls and listeners, read-only hint requests, request generations, current hints, basket invalidation, review enquiry UI and closure/cutoff checks.
- `customer-checkout-submission.js`: submit handler, its private in-flight guard, authoritative booking-client request, uncertain-response handling, explicit price-change refresh and success/reset behaviour. Existing compatibility paths are retained verbatim rather than redesigned or removed in this step.
- `customer-checkout.js`: explicit initialization, live dependency getters/setters and existing compatibility wrappers, plus display, pricing/loyalty and legacy helpers. It is 2,277 lines; extracted availability is 522, dialog 145 and submission 729.

Factories only register when their scripts load. They are explicitly initialized at the original points in the synchronous bootstrap, without introducing an asynchronous initialization gap. Five once-only ordered classic scripts remain in use; no framework or build system is introduced. The non-strict semantics of the existing submission error helper are preserved. Function dependencies retain unbound-call semantics. Mutable state remains live through accessors; temporary hint/generation accessors bridge the still-existing order-type/address listeners.

This is structural work: no visual change, form-opening timing change, menu/policy change, altered booking payload, removed backend checks or relaxed scheduling/pricing rule is included. Browser hints still cannot authorize a booking.

## Evidence and checks

The extraction uses recorded identifier-reference edits, excluding property keys and literal text. Reversing those edits reconstructs the complete preceding draft bootstrap byte for byte. The earlier dialog extraction then reconstructs the production baseline byte for byte, including mixed line endings. Original region hashes, edit positions and current module hashes are in CHECKOUT-CONTROLLERS-EXTRACTION-2026-11-19.json.

Existing focused policy tests run against that hash-checked lexical reconstruction. Separate executable factory tests exercise the actual new dependency/state boundaries: latest date/type/address/basket payload, selected hidden time, late-response rejection, basket invalidation and cancellation, missing address, authoritative single submission under duplicate clicks, uncertainty retention, price/loyalty refresh, invalid-slot rejection and no legacy writer fallback after a managed booking error. Startup side effects, script order, syntax and the local browser-test asset routing are covered too.

Full website suite: 123 tests pass. Hosted browser verification remains pending; direct HTTP reads received Cloudflare 403. Do not treat automated tests or preview deployment as a completed end-to-end checkout review. No customer order is needed for the next preview checks, and the draft is not merged into production.
