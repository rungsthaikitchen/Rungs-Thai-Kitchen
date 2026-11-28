# Legacy checkout capacity probes

Base: 4fef9124021587ab9dae0c7f7c3839f02fe95fc9.

Four active helpers move into createCapacityProbes in the existing legacy schedule module: schedule refresh, item load, basket load and slot-fit probe. Checkout retains wrappers, category configuration and shared capacity-map ownership. Live getters/setters preserve current basket/catalogue, allocator callbacks and map replacement. No new script.

The moved bodies only qualify external dependency accesses. Allocation still runs on a copied map; schedule refresh still awaits loading, builds and replaces the map, then logs/returns it. No scheduling policy or Master Wok changes.

Validation: 269 tests pass without failures/skips. Source proofs reconstruct both released files byte for byte. Actual factory tests cover load coercion/defaults, live basket/category replacements, occupied/free probes using the real allocator, unchanged real map identity/contents, zero-load short circuit, delayed refresh, exact replacement identity and rejection retaining the prior map. Syntax, script loading and whitespace checks pass. Hosted startup is recorded in the PR. No orders submitted.

Compatibility review: focused runtime-source search found getSlotStart/buildKitchenSlotMap, isBetween, findNextAllowedFromNow, isWedThuLondonForFulfilment and refreshKitchenScheduleForDateTime only as definitions/internal references in current customer scripts. Archived index_inline_ordering_refactor.html files contain related independent implementations. These candidates remain in place pending a dedicated full callsite/global-use cleanup. Next step is that cleanup and final customer-journey verification/module map; further extraction should be driven by active responsibilities, not bootstrap line count.
