# Checkout validation and paused-alert display extraction

Base: ef9c9105ad9ccbe0056a1bcfee3f2646d93237bd.

Move preferred-time validation and paused-order alert show/hide bodies into createValidationAlerts in the existing checkout-display module. Keep wrappers and the original OK click listener in checkout. All dependencies use live getters, avoiding reads of later initialised availability/control state at factory creation. No new script.

Preserve blank-time behavior, strict boolean hint gating, closed-before-fully-booked precedence, message defaults, submit disabled state, alert focus/display and missing-element guards. No scheduling or service policy changes.

Validation: 265 tests pass without failures/skips. Complete checkout/display source reconstruction proves only dependency access changed. Actual module tests compare released blank/closed/fully-booked behavior, defaults/custom text, focus and visibility, then cover replacement hints/windows, missing submit button and missing alert controls. Syntax, synchronous loading and whitespace checks pass. Hosted startup evidence is recorded in the PR. No service state, orders, database or notifications changed.
