# Checkout display extraction

Base: 741213be8f9880f335ebf94c83ff32418a891c98.

Groups five existing display functions in customer-checkout-display.js: order-type summary, address-required hint, preferred-time message show/hide and submit-button label/state. Bootstrap compatibility wrappers and event wiring remain. The only body edits are explicit live dependency access for the form and fallback quote. No wording, validation, quote eligibility or scheduling decision changes.

Validation: 156 tests pass with zero failures/skips. Actual module output matches released functions in 60 order-type, quote, button/input and address combinations. Tests also cover live quote replacement, transition back to Collection, clearing disabled state/title, message replacement/clear and absent optional DOM nodes. Registration/factory creation do no DOM work. Complete bootstrap reconstruction remains byte-for-byte checked, and historical extraction tests undo this boundary first. Syntax and CRLF-aware whitespace checks pass.

No identity, order, review or notification created. Hosted startup verification remains pending. Draft only; not deployed.
