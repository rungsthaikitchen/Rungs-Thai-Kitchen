# Customisation extras and unit-price preview extraction

Base: 7f14e91e485eedd56cd0e15c2e10ff0674d11798.

Moves sumExtras, buildExtraChips, handleExtraClick and updateUnitPricePreview into customer-customisation-pricing.js. Bootstrap retains selected modifier/extra state, canonical customisation opening, spice selection and add-to-basket calculation. Live getters/setter preserve selectedExtras replacement and current item controls. Compatibility wrappers retain existing call sites. Only explicit dependency accesses change in the moved functions.

Validation: 183 tests pass, zero failures/skips. Actual output matches released code across 40 allowed-extra/modifier/selected-extra combinations. Checks cover one-extra selection/replacement/deselection, hidden extras, live base/modifier changes, rounding and absent optional wrapper. Registration/creation performs no DOM work. Complete menu bootstrap reconstruction, ordered classic-script loading, syntax and CRLF-aware whitespace checks pass.

No catalogue, price, modifier, extra, spice or basket policy changes. Hosted customisation check pending. No identity/order/notification created. Draft only; not deployed.
