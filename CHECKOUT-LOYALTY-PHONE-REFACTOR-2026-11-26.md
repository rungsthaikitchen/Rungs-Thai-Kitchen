# Checkout loyalty phone lookup extraction

Base: dfd910ce382965574e152045c9b55839912465d3.

Move the existing phone-lookup IIFE into customer-checkout-loyalty-phone.js behind an explicit bind call at its original position. Only external dependency references change to live getter accesses. Preserve the shared loyalty object, private request generation, phone value guard, public RTKRefreshLoyalty hook, blur/change callbacks, balance/default calculations, logging and render order. No discount or redemption policy changes.

Validation: 244 tests pass without failures/skips. Full bootstrap reconstruction verifies the extraction. Actual-module tests compare released balance/default behavior, callback identity and ordering; check missing phone input, delayed responses, later lookup precedence, changed phone values, replacement state/callbacks and rejected fetches. Registration performs no DOM work. Script loading, syntax and whitespace checks pass. Hosted startup evidence is recorded in the PR. No orders or notifications submitted.

Remaining checkout responsibilities include geocoding, discount click handling, reviewed links, legacy refresh/probe orchestration, reset/idempotency compatibility helpers and shared bootstrap state. These remain unchanged for separate review.
