# Customer website refactor checkpoint — 25 November 2026

Reviewed commit: 6bf5bf9c8b2775a1930ea1f151b0e9dbf6b0b5eb (PR #127).
Comparison baseline: dd73e0c88c3f83ec6173a912e51748967a324334 (PR #100 checkpoint, not the original pre-refactor website).

## Progress

| Bootstrap | PR #100 lines | Current lines |
| --- | ---: | ---: |
| customer-menu-basket.js | 1,731 | 468 |
| customer-checkout.js | 2,277 | 1,395 |
| Combined | 4,008 | 1,863 |

These counts show separation of responsibilities, not deletion of the corresponding functionality or a measured speed improvement. Module wrappers, tests and evidence add code elsewhere.

## Current responsibility map

| Area | Modules |
| --- | --- |
| Menu and allergens | customer-menu-catalogue.js, customer-menu-rendering.js |
| Basket and reviewed restore | customer-basket-controls.js |
| Dish customisation | customer-customisation-pricing.js, customer-customisation-selectors.js, customer-customisation-dialog.js |
| Menu/page interaction | customer-menu-overlay.js, customer-page-controls.js, customer-interactions.js |
| Delivery quote | customer-delivery-quotes.js |
| Checkout lifecycle | customer-checkout-dialog.js, customer-checkout-reset.js |
| Availability and submission | customer-checkout-availability.js, customer-checkout-submission.js |
| Checkout pricing and notices | customer-checkout-pricing.js, customer-checkout-service.js, customer-checkout-display.js |
| Customer and confirmation | customer-checkout-customer-data.js, customer-checkout-confirmation.js, customer-order-success-compat.js |

The two bootstraps still own shared state, DOM references, compatibility globals, initialization order and the remaining legacy functions. This is not yet a fully isolated module architecture.

## Next implementation slice

Extract the **legacy kitchen production allocator** first. The cohesive initial group is getKitchenStartForDate, getLatestProductionSlotStart, allocateLoadBackwards and forceAllocateExistingLoad. Review getSlotStart/buildKitchenSlotMap and effective-order-time/production-map functions as adjacent responsibilities; include them only when their dependencies and tests are explicit.

Keep the existing constants, maps and callsites unchanged during extraction. Do not alter scheduling policy or Master Wok. Add differential tests that compare the actual extracted implementation to the released code for empty/occupied maps, capacity limits, earliest production boundary, partial allocation failure, forced existing commitments, and non-mutating basket-fit probes. Preserve Date and Map semantics and mutation order.

After the allocator, separate legacy schedule loading and time eligibility. The remaining checkout section includes database order-capacity reads, preferred/proposed/confirmed time selection, service closures, customer opening times versus alternative fulfilment overrun, and the Master Wok hints branch. These are distinct from the allocator and should have separate tests and evidence.

## Remaining work after scheduling

- Address geocoding and event orchestration, including async result sequencing and existing listeners.
- Phone/loyalty lookup wiring and reviewed-time/checkout adapters.
- Compatibility globals and shared state ownership; only remove wrappers after all callers are mapped.
- Dormant ticker setup and old helpers: the status ticker HTML is commented out, but other inline scripts still refer to ticker elements. Audit those references before removing them.
- Inline index.html behaviours, CSS duplication and eventual visual changes need their own scope. They are not complete merely because customer scripts were extracted.

## Validation and publication boundary

Latest implementation suite: 221 tests passed for PR #127; GitHub customer-regression and Cloudflare preview checks succeeded. Hosted checks exercised menu/card/button customisation and Escape; no order was submitted. Many extraction tests reconstruct historical source while dedicated module tests exercise the moved implementations. These prove different things and should remain clearly labelled.

This checkpoint is documentation only: no runtime files, feature flags, database, payment recording, notifications or production deployment change. Future runtime slices follow tests, hosted review and explicit production approval.
