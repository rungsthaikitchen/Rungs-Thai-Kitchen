# Reviewed basket restoration extraction

Base: 21beaa1810d7ee779a6d55f70684d41fe526fba7 (PR #125).

Move RTKRestoreReviewedBasket implementation into the existing customer-basket-controls.js factory. Keep the global wrapper and its assignment timing. Read the current basket, confirm and render callback through live context access. Preserve confirmation text, false return on decline, reviewed field mapping, array identity and single render call. No additional module/script is introduced.

REVIEWED-BASKET-EXTRACTION-2026-11-25.json records the exact moved implementation and changes to both bootstrap and basket module. Inverse helpers reconstruct the complete released versions and chain through earlier proofs.

Validation: 217 tests pass, zero failures/skips. Actual restore is compared with the released implementation for empty/existing baskets, accept/decline, full modifiers/prices/quantities/spice/notes/image payload, shared array identity and rendering order. Global wrapper uses a replaced current basket and forwards return values. Invalid payload exception behaviour is retained. Syntax and whitespace checks pass. Hosted startup checks pending.

No approval workflow, price, order submission or notification changes. Publication awaits user approval.
