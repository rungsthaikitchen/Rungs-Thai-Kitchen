# Checkout event wiring extraction

Base: 0c092e9e33314f39bb278be1da080eee9b9fda77.

The existing contiguous open/close, order-type, address-input and DOMContentLoaded/address-blur listener block moves into customer-checkout-events.js. One explicit bind call remains at the original registration position, with live dependency getters. Factory registration performs no DOM work. Date selection already belongs to the availability module and stays there. Pricing recompute, discount, loyalty, reviewed-link and submission listeners remain unchanged.

The only edits inside the moved block qualify external dependency references. Event names, messages, guard conditions, generation/context checks, cancel calls, await order and listener multiplicity remain unchanged. No new deduplication, scheduling policy, database, fee, payment, notification or design change is introduced.

Validation: 240 tests pass without failures/skips. Source reconstruction recovers the complete released bootstrap. Actual-module tests exercise pre-await clearing, stale generation and changed-context rejection, delivery-only input invalidation, delayed geocode completion using the current date, registration counts, empty basket/subtotal and backdrop/close behavior. Native address validation tests now invoke the actual module binder. Synchronous script order, syntax and whitespace checks pass. Hosted startup verification is recorded in the PR. No orders submitted.
