# Checkout service notices and closure loading extraction

Base: 1fa255081373915cc0ae61286b3a047997ff7bac.

Moves seven existing service/closure functions into customer-checkout-service.js: loadBlackouts, renderServiceStatusNotice, loadServiceState, inAnyWindow, showCheckoutBanner, hideCheckoutBanner and showBlackoutBannerForDate. Bootstrap retains shared state and startup/event calls. Live getters/setters expose current Supabase client, state and blackout arrays. Only explicit dependency accesses change inside the moved bodies. No service policy, capacity, dates, endpoints, error handling or wording changes.

Validation: 165 tests pass with zero failures/skips. New executable comparisons cover all notice modes with/without text, successful/missing/error service responses, blackout query horizon/partitioning/failure retention, closure date banners and inclusive time boundaries. Module registration/creation performs no DOM/network work. Full bootstrap reconstruction remains byte-for-byte checked; earlier source proofs reverse this extraction first. Syntax and CRLF-aware whitespace checks pass.

Tests mock service/database calls; no service setting, closure, order, review or notification was changed. Hosted startup check pending. Draft only; not deployed.
