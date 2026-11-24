# Menu rendering and search extraction

Base: 405d354df6d987e2a177db906086a59004db5928.

Move menu-card construction, category filtering and both existing search-input listener bodies into customer-menu-rendering.js. Instantiate inside the original DOMContentLoaded scope. Bootstrap wrappers preserve buildMenu/filterMenu names; bindSearch is called at the original listener-registration position. Catalogue, formatting, allergen and customisation callbacks are live dependencies. Existing customisation click wiring, sorting, datasets and ITEMS_BY_ID enrichment remain unchanged. No duplicate handlers are removed in this extraction.

Validation: 174 tests pass, zero failures/skips. Actual renderer output matches released code for the full catalogue, including card HTML, category/card order, datasets and enriched customisation map. Repeated rebuild retains the existing once-only delegated listener. Both search inputs preserve their separate released behaviour. Category-aware queries include matches, whitespace/case normalization, no-match and reset. Registration/factory creation performs no DOM/listener work. Complete menu bootstrap reconstruction, classic-script loading, syntax and CRLF-aware whitespace checks pass.

Hosted search/customisation check pending. No order, identity or notification created. Draft only; not deployed.
