# Basket display and quantity controls extraction

Base: ae66f72d01ce2a4c930826f61a906c62ec2c1361.

Move renderOrder and the existing order-panel click listener into customer-basket-controls.js. Instantiate within the existing DOMContentLoaded scope. Bootstrap retains renderOrder wrapper, shared basket state, customisation/add-item wiring, reviewed-basket restoration and window.renderOrder exposure. Register quantity controls at the original point. Only explicit live dependency accesses change inside moved code.

Validation: 179 tests pass with zero failures/skips. Actual rendered empty/populated basket DOM, modifiers/spice/images and rounded totals match released code. Executable controls cover increment, decrement floor, remove-to-empty, shared array identity, live replacement, unrelated clicks and event-before-discount-refresh order. Registration/creation has no DOM/event work. Complete menu bootstrap reconstruction, classic-script order, syntax and CRLF-aware whitespace checks pass.

No pricing, discount, availability, booking or customisation policy changes. Hosted quantity-control checks pending. No order, identity or notification created. Draft only; not deployed.
