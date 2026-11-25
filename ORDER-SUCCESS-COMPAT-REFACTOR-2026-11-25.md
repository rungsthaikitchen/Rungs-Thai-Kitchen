# Order success compatibility extraction

Base: 6467028dfd4a168704f65266b270bfebf462194e (PR #118).

Move the legacy success popup setup into customer-order-success-compat.js. The complete original block is preserved byte for byte inside an explicit install method, called at the original bootstrap position. Registration/factory creation do not touch the DOM. Existing duplicate dismissal listeners, global aliases, total observer and deferred correction remain unchanged. The newer checkout confirmation still installs afterwards and replaces the legacy renderer.

ORDER-SUCCESS-COMPAT-EXTRACTION-2026-11-25.json records hashes, the exact original block and replacement. The inverse reconstruction proves the full bootstrap matches the released base, then chains through earlier extraction proofs.

Validation: 195 tests pass, zero failures/skips. Actual compatibility renderer is compared to the released block across collection/delivery, holding flags, time presence and four total sources. Tests cover aliases, fallback alerts, optional elements, dismissal listeners, and the integration with the newer confirmation renderer and latest-order receipt download. Syntax, synchronous loading order and CRLF-aware whitespace checks pass. Hosted startup checks pending.

No confirmation wording, total calculation, receipt, order submission or notification changes. Publication requires user approval.
