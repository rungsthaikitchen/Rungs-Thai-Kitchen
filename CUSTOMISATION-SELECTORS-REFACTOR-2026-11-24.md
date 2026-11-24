# Customisation modifier and spice selectors extraction

Base: fbe578ced5ed032b5a6ffd5929103cf964405f2c.

Move buildModifierChips and buildSpiceSelector into customer-customisation-selectors.js. Keep shared selection state, canonical opening, extras pricing and add-to-basket logic in the bootstrap. Live getters/setters and compatibility wrappers preserve original state transitions. Only explicit dependency access changes inside moved bodies.

Validation: 187 tests pass, zero failures/skips. Actual output/state matches released modifier controls over 12 required/multi/max combinations and spice controls over 40 enabled/default/minimum combinations. Interactions cover selection/deselection/replacement, caps, required Add gating, price-refresh counts, pressed state, clamping and disabling/reset. Existing six restricted-dish spice tests now execute the actual module. Registration/factory creation has no DOM effects. Complete menu bootstrap reconstruction, classic-script order, syntax and CRLF-aware whitespace checks pass.

No dish, price, modifier or spice-policy changes. Hosted controls check pending. No identity/order/notification created. Draft only; not deployed.
