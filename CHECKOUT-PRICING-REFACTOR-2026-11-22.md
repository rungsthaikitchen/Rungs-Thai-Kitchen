# Checkout pricing and loyalty extraction

Draft based on production `8f3cae1c4a1e10043e7a80363314b1ace83d9395`, including the corrected delivery fallback message.

`customer-checkout-pricing.js` registers a classic-script factory containing twelve existing functions (523 lines): voucher validation/revalidation, loyalty application/projection/rendering/lookup, delivery hint helpers and total recomputation. Bootstrap keeps shared state, phone lookup generations and event listeners; public function names remain compatibility wrappers. Initialisation occurs after loyalty state is created, before existing recomputation listeners are registered. Mutable subtotal, voucher and loyalty state are read through live getters; writable scalar state has setters. Function dependencies are called unbound, preserving the original invocation behavior. Loading the factory performs no DOM, storage or provider operations.

No changes to calculation order, rounding, fee thresholds, loyalty eligibility/reservations, provider endpoints, UI wording, scheduling, checkout payloads or backend authority. No new framework or asynchronous loader. Script order and cache keys updated; browser test asset serving includes the module.

Validation: 134 tests pass. The extraction record stores the exact prior function bodies and verifies that the only edits inside them are explicit dependency accesses. Replacing wrappers and removing the recorded initializer reconstructs the complete production bootstrap byte for byte, including mixed line endings. Historical earlier extraction proofs compose through this reconstruction; dedicated pricing and loyalty tests execute the current factory.

Actual current pricing output is compared to the released functions across 540 combinations of subtotal, voucher, reserved/available loyalty balance and collection/delivery quote state, including zero distance, unknown distance, route fallback, loading and explicit ineligibility. Additional tests exercise live state changes, voucher refresh/removal and loyalty transport success/failure without provider traffic. The corrected fallback wording has executable coverage against the extracted message block.

Hosted browser validation remains required before release. No order or basket review has been submitted for this draft. Production has not been changed.
