# Checkout responsibility boundaries — 14 November 2026

Preview only. Production baseline is 697f8c8f0b3c42cb79706fe5cbae80a80b55c3bc.

The original 3,446-line checkout script combined availability state, popup operations, form submission, pricing/loyalty display and legacy scheduling compatibility. Separate three responsibilities behind explicit factory APIs:

- `RTKCheckoutAvailability.create(context)` owns the selected date/time controls, request generation, current hints, basket invalidation, review dialog and time-picker listeners. Exposes `populate`, `refresh`, `clear`, `basketKey`, read-only hint access and invalidation.
- `RTKCheckoutDialog.create(context)` owns the opening guard, loading feedback, retained selection refresh and popup open/close operations.
- `RTKCheckoutSubmission.create(context)` owns the form handler and in-flight submission guard, including the authoritative booking-client call, success/reset and existing compatibility path.

The bootstrap retains pricing/loyalty display, settings and legacy helper definitions. Its explicit getters keep mutable values live across asynchronous work; function calls retain their original unbound-call semantics. The new modules register factories only when loaded. Initialization still occurs at the original points inside one synchronous bootstrap execution, avoiding newly introduced asynchronous gaps while checkout state is partially initialized.

Existing public compatibility entry points remain wrappers. Plain ordered scripts remain in use; no framework or build step is introduced. Preserve the original non-strict classic-script semantics during extraction: the existing submission error handler relies on function-scope visibility for a declaration inside its try block. A failure/retry test covers this path. Normalize such legacy code separately before changing strictness.

The checkout bootstrap/display file is now 2,237 lines. Availability is 478, dialog 147 and submission 721. Dependencies and source hashes are recorded in CHECKOUT-CONTROLLERS-EVIDENCE.json.

No design, prices, discounts, delivery policy, capacity rules, booking endpoints, Admin behaviour or backend deployment change. The already-released booking client, including six-hint batches and transient retry, is untouched.

Validation: 74 tests pass. Existing checks cover selection retention, current-basket hints, cache bypass, stale responses, cancellation and ordering cutoff. New executable factory checks cover side-effect-free module loading, exactly one authoritative submission under double clicks, unchanged commercial payload, uncertain-response basket retention/retry, no legacy write fallback and missing-date rejection. Hosted preview review follows; no production change is authorized by this preview.
