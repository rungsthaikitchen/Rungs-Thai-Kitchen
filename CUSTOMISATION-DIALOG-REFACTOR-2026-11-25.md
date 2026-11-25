# Customisation dialog extraction

Base: 97a87c24c1b1734e5b9cc2336bb8fc6a4ee0aa21 (PR #116).

Move the canonical opener, close/reset function and existing quantity/add/dismiss bindings into customer-customisation-dialog.js. Shared mutable state remains owned by the bootstrap and is accessed through live context getters/setters. Compatibility aliases, duplicate legacy opener and delegated menu handlers remain in place; this step does not consolidate their behaviour. Binding occurs once at the original execution point. Module registration and creation do not interact with the DOM.

The moved bodies change only dependency accesses. CUSTOMISATION-DIALOG-EXTRACTION-2026-11-25.json captures original/revised regions and hashes. The inverse reconstruction test checks the entire original bootstrap, then chains through previous extraction proofs.

Validation: 191 tests pass, no failures/skips. Actual module is compared against the released functions for six extras/image/allergen combinations, resets, quantity minimum, three-portion basket payload, modifiers/extras/spice, callback order, close/cancel/backdrop, missing dish and missing current item. Classic loading, syntax and CRLF-aware whitespace checks pass. Hosted preview validation pending.

No menu, pricing, spice, scheduling, checkout submission or notification policy changes. No production release until user approval.
