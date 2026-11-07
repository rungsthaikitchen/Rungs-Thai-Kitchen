# Delivery arrival scheduling — draft integration

Pairs with the delivery feature branch in rungsthaikitchen/master-wok-shadow.
Production is unchanged. Do not merge/deploy these UI changes separately from its
certified runtime: the kitchen-only runtime does not implement delivery trip actions.

Checkout sends the selected fulfilment type and address with time-hint requests,
refreshes after type/address changes, and invalidates stale address-specific times.
The existing authenticated Admin gets a Delivery trip button for delivery orders.
It supports recommendation review, manual pair selection and stop order, an exact
trip preview followed by explicit confirmation, and splitting a combined trip.
All writes use the existing authenticated Admin gateway and server plan revision.

27 existing website regression tests pass. Admin inline scripts and the new JS
module parse. The new real-browser test is prepared but blocked: Chromium is absent
and the browser download returned an invalid archive. Full hosted staging and
browser sign-off are still required; do not infer them from server test results.
The existing index has a print-template script that a naive script-tag regex cannot
parse in both baseline and feature versions; this is not used as browser evidence.

See the core branch's DELIVERY-SCHEDULING.md for policy, tests and remaining gates.
