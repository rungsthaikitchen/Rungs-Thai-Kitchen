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

Full website suite: 123 tests pass, rechecked on 22 November. Availability-controller fixtures now pin the clock to 19 November instead of depending on the day the tests run. This changes tests only.

Hosted browser checks on 20 November completed Cloudflare Access sign-in with the owner's authorisation. On preview `aa1975bd`, adding a menu item, opening feedback, closing/reopening, retained Delivery choice, basket retention and retained selected time were observed. No order or basket review was submitted.

The initial 21 November availability search returned all slots unverified. Read-only staging investigation found two existing commitments and saved plan revision 6. The corrected validator rejects that plan with `COMMITTED_PLAN_RESOURCE_CLASH`; independent ring validation reports four `HOB_FOOTPRINT_CONFLICT` entries. Preserve this historical fixture rather than weakening the validator or silently rewriting it. Gateway availability requests returned HTTP 200 in approximately one second each.

5 December was verified to have no staging commitments, saved plan or active blackout. The same browser basket returned all 49 normal-service times for Collection and Delivery. Selection of 18:30 and Delivery persisted after reopening. This is a narrow availability/lifecycle check, not a submitted-order or whole-service qualification.

A separate delivery warning remained visible despite successful geocoding. Source comparison on 22 November confirms the entire delivery-message block is byte-identical to production baseline `4fe9847`: `quote.eligible === false || quote.usedFallback` selects the address-error message, so a route-pricing fallback can display an address failure. The earlier browser evidence does not prove which fallback caused that instance. Do not claim full delivery-pricing QA or change that policy as part of this extraction. The previous browser session was no longer available on 22 November; no fresh browser result is claimed.

The refactor remains draft and has not been merged or deployed to production. Remaining work includes fuller basket/browser coverage and a separate decision on accurate fallback messaging.
