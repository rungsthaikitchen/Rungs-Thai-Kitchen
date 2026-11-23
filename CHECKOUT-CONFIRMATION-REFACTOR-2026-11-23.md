# Checkout confirmation extraction

Base: 4fe293d8dc7ff6d6ea0ca1ee08b760b70cb8a775 (released pricing refactor).

Moves the existing success popup block unchanged into customer-checkout-confirmation.js. The bootstrap installs it at the original point, preserving the window.showOrderSuccessNew override, initial receipt state and global stripChillies compatibility wrapper. Script registration has no DOM or receipt side effects. The earlier menu renderer remains unchanged; removing duplicate renderers is a separate behaviour review. Receipt generation remains in its existing script.

Validation: 146 tests passed, zero failures/skips. The new module is compared against the recorded released block across 16 collection/delivery, holding-review, time and optional-element combinations. Additional cases verify registration, repeated confirmations use the latest receipt, missing-popup alert fallback, and full bootstrap reconstruction. Existing pricing and earlier extraction proofs reverse this change before their historical checks. Syntax and once-only synchronous classic-script loading are covered.

No live order or notification was created. These are executable DOM-fixture tests, not hosted order-submission certification. Pricing, availability, scheduling, server communication and confirmation wording are unchanged. Draft for review; not deployed.
