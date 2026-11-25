# Checkout time eligibility extraction

Ten helpers move into customer-checkout-time-eligibility.js: local date key, clock parsing, five-minute rounding, opening hours, closures, fully booked periods, ordinary eligibility, alternative eligibility, and the two next-time searches.

Only external dependency accesses change to context properties. Getter injection preserves current closure arrays and availability hints; existing wrappers retain callsites. Schedule refresh, shared map ownership, basket probing, and customer event wiring remain in checkout.

No opening-hour, closure, capacity, overrun, Master Wok hint, fee, payment or notification policy changes. In particular, ordinary hints still require normal opening hours; alternative hints retain their original separate behavior. Alternative searches reload the production map whenever the local date changes.

Validation: 236 tests pass without skips/failures. Source reconstruction proves the full released bootstrap is preserved apart from extraction. Actual module tests compare 240 eligibility boundary cases, ordinary searches and date reload sequences against released bodies; cover replacement state, strict boolean hints, exclusive closure ends, inclusive 22:00 overrun, rounding, unchanged input dates and the 30-day failure cap. Loading order, syntax and whitespace checks pass. Hosted startup evidence is recorded in the PR. No orders submitted.
