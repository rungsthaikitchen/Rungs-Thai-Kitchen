# Checkout reset and retry-key extraction

Base: 16d4196a17f0b1534049547958eedb6b55c35567 (PR #122).

Move resetCheckoutForNextOrder and getIdempotencyKey into customer-checkout-reset.js. Bootstrap wrappers preserve local callsites. Mutable discount/date state is written through context setters; DOM, storage and public quote resets occur only when the original functions are invoked. No extra state is cleared and no new reset/key rotation callsites are introduced.

CHECKOUT-RESET-EXTRACTION-2026-11-25.json records original/revised bodies and hashes. The inverse reconstruction checks the complete released bootstrap and chains through earlier proofs.

Validation: 210 tests pass, zero failures/skips. Actual module matches released reset behaviour with full/missing/alternate discount fields. Checks cover fields, discount/date state, message hiding, public quote clearing, retained unrelated state, same-key retries, fresh key after reset and propagation of storage failure. Syntax, synchronous loading and whitespace checks pass. Hosted startup check pending.

No submission, retry, customer data retention or ordering policy changes. Publication awaits user approval.
