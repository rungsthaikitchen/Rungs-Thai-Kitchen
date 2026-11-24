# Menu catalogue extraction

Base: a79d7153b590d55289b03fb6d34679d7299dfa56.

The menu/basket script still mixed menu data and allergen helpers with customisation, basket controls, delivery quotes and overlapping compatibility functions. Move the contiguous catalogue/allergen block unchanged into customer-menu-catalogue.js. The existing DOMContentLoaded callback creates its catalogue at the original point; aliases preserve all existing lexical consumers. ITEMS_BY_ID enrichment and basket event wiring remain in the menu/basket script. No duplicate customisation or success renderer is removed in this change.

Validation: 169 tests pass, zero failures/skips. Complete catalogue data compares with the released block, including prices, modifiers, extras, images, descriptions, allergens and spice restrictions. Executable allergen helper outputs match for aliases, duplicate and unknown keys. Registration/creation has no DOM/network work and creates independent data. A complete menu-script reconstruction checks byte-for-byte equivalence. Existing six-dish spice tests now read the actual catalogue module. Script loading and local test asset routing include the new module.

Hosted menu/customisation check pending. No live order or customer data created. Draft only, not deployed.

Remaining refactor priorities: separate menu-card rendering/search, then customisation and basket controls. Review duplicate helpers only after their effective call paths are covered. Keep delivery quote lifecycle and retained checkout state intact; legacy scheduling remains outside this catalogue extraction.
