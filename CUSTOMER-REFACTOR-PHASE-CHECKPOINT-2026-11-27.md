# Customer extraction phase checkpoint

Base: 0d8c3f502c220305c6688ebebc7443b3d0b7cb2a.

## Compatibility cleanup

Remove six uncalled definitions from current customer-checkout.js: getSlotStart, buildKitchenSlotMap, isBetween, refreshKitchenScheduleForDateTime, findNextAllowedFromNow and isWedThuLondonForFulfilment. A repository runtime-source search and a test of index.html plus its local script sources found no remaining references. The removed slot-map helper's only dependency among these names was getSlotStart. No inline event attributes, public-hook assignments or string lookups name them. Archived inline-ordering pages retain their own independent implementations.

Evidence CHECKOUT-COMPATIBILITY-CLEANUP-2026-11-27.json records removed bodies and insertion positions. Reconstruction proves the remaining bootstrap is unchanged. Existing constants are retained; no active calls, state, policy or registration ordering changes.

## Module map

All 27 customer script tags remain synchronous classic scripts, each loaded once. Menu bootstrap precedes availability/dialog/submission and checkout bootstrap. Small compatibility factories live in existing modules where appropriate.

| Files (customer- prefix, .js suffix) | Responsibility |
|---|---|
| menu-catalogue | Menu, modifiers, allergens and extras |
| menu-rendering | Menu cards/categories |
| basket-controls | Basket changes and reviewed-basket restoration |
| customisation-pricing, customisation-selectors, customisation-dialog | Dish options, price and dialog lifecycle |
| order-success-compat, menu-overlay | Earlier confirmation compatibility and menu overlay |
| page-controls, interactions | Header/lightbox and delegated menu/Escape interactions |
| delivery-quotes | Quote calculation, refresh and geocoding |
| checkout-reset | Both existing reset/retry-key implementations, separately preserved |
| menu-basket | Shared menu/basket state, compatibility wrappers and startup wiring |
| checkout-availability | Slot requests, date/time controls, review fallback and stale-result handling |
| checkout-dialog | Open/close lifecycle and reviewed-checkout handoff |
| checkout-submission | Submission guard and booking flow |
| checkout-pricing | Discounts, loyalty arithmetic and totals |
| checkout-service | Service state, blackouts and banners |
| checkout-display | Summary, native address requirement, messages, submit state and validation/paused alerts |
| checkout-customer-data | Customer/ref lookup |
| checkout-confirmation | Current confirmation/receipt |
| legacy-kitchen-allocator | Production-step allocation |
| legacy-kitchen-schedule | Existing-order schedule and live basket/capacity probes |
| checkout-time-eligibility | Opening/closure eligibility and alternative-time searches |
| checkout-events | Checkout, address, order-type and pricing listener bindings |
| checkout-loyalty-phone | Phone lookup generation guard and loyalty state updates |
| checkout | Shared service/discount/loyalty/capacity state, constants, DOM references, controller creation and wrappers |

## Validation and phase boundary

271 automated tests pass without skips/failures: existing policy/controller tests plus actual module behavior, full source reconstruction and classic-script loading checks. Source syntax and whitespace checks pass. Hosted customer-journey results are recorded in the PR; orders are not submitted during preview verification.

This completes the planned extraction/compatibility-cleanup implementation, subject to hosted checks and release approval. Bootstrap line counts are 649 checkout and 468 menu/basket; most removed implementation moved into modules rather than disappeared. These counts are not speed measurements.

Remaining bootstrap responsibilities intentionally stay together. Separate future work may consolidate duplicated reset paths and order-type totals callbacks, tidy obsolete comments/constants, reduce shared global state, improve menu-overlay accessibility, or redesign HTML/CSS. Those would require their own behavior decisions/tests and are not blockers for this extraction phase. Master Wok performance/feasibility and Admin/backend work remain separate objectives. No policy, fees, payment flags or production data changed here.
