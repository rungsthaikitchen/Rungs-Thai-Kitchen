# Reviewed checkout handoff extraction and checkpoint

Base: f65fa429f8bf6833aff72cd74ed6a0411bbe78f3 (includes independent LEGACY Admin reconciliation changes).

Move the three reviewed-checkout public hook assignments into createReviewedHandoff in the existing checkout-dialog module. Install the delivery hook and the time/open hooks at their original separate positions. Use current basket, controls and callback getters. The original time conversion, event dispatch, geocode forwarding and subtotal calculation remain unchanged apart from explicit dependencies. No new script.

Validation: 261 tests pass without skips/failures. Source proofs reconstruct the complete released checkout and dialog module. Actual-module tests compare London summer/winter/midnight results with released code, verify date-population-before-time ordering, delayed population and rejected population behavior, staged hook installation and live basket/callbacks. Syntax, synchronous loading and whitespace checks pass. Hosted startup verification is recorded in the PR. No approval links, geocode requests or orders submitted.

## Phase checkpoint

The menu bootstrap is 468 lines and checkout is 835 lines in this draft. Lines include dependency getters, wrappers, shared state, configuration and comments. These counts do not measure speed or total code reduction; implementations live in modules.

Remaining implementation review is bounded to:

1. Preferred-time validation and paused-service alert display/close behavior: move to existing service/display boundaries with current state and UI tests.
2. Legacy basket-load/capacity probing and refresh orchestration: identify active callsites, then separate any still-active cohesive logic while retaining map ownership and copy-before-probe behavior.
3. Compatibility cleanup: audit candidates getSlotStart/buildKitchenSlotMap, isBetween, findNextAllowedFromNow, isWedThuLondonForFulfilment and refreshKitchenScheduleForDateTime. The focused customer-script search found definitions/internal references only for these names, but full-repository/global-use review is required before removal. No removals are included here.

Finish this phase with a whole-customer-journey regression check and an updated module/dependency map. Shared state, constants, compatibility wrappers and controller creation may remain in the bootstrap where they coordinate modules. HTML/CSS redesign, Master Wok tuning, policy changes and Admin work are separate objectives.
