# Customer ordering refactor — first step

The customer page mixed presentation, menu/basket and checkout implementation in 9,273 lines. This step moves the two main existing script bodies into named files while preserving their contents, scopes, dependency order and synchronous classic-script loading. The page is now 4,185 lines; customer-menu-basket.js contains 1,719 lines and customer-checkout.js contains 3,369.

This is the foundation for smaller responsibilities, not a finished modular rewrite. No business rules, endpoints, menu prices, allergens, delivery policy, discount/loyalty behaviour, opening rules or Master Wok decisions change. Existing compatibility and legacy code remains for a separately reviewed cleanup. Styling and the customer layout remain the same.

The extraction evidence records the production base commit, exact script byte hashes, and matching original/reconstructed page hashes. Replacing the two external references with their extracted bodies reproduces the original index.html byte for byte. Existing focused menu/allergen and checkout-availability tests now inspect the referenced source. The local browser-test server serves the new assets. Loading tests check both script syntax and once-only ordered classic loading.

Next steps after acceptance: separate menu/catalogue and basket calculations behind small explicit interfaces, then split checkout display, availability and submission. Test each boundary before removing duplicate helpers or old code. Preserve the server as authority for booking/pricing; do not move operational decisions into the browser.

Staging preview only. Production remains unchanged until reviewed.
