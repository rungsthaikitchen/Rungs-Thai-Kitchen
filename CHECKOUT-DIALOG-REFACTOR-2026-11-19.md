# Checkout dialog lifecycle extraction

Draft for review. Based on production website merge 4fe98474beda7bce04fd7212b40ce335dc3fb93e, including the explicit-closure basket review fix. This change is separate from the earlier unpublished three-controller prototype and uses the current live implementation.

`customer-checkout-dialog.js` registers a factory with no DOM, storage or network access during loading. The existing bootstrap explicitly creates one controller at the original lifecycle initialization point. The new classic script loads synchronously before the bootstrap. Existing `window.openCheckout`, close/cancel/backdrop listeners and review entry points retain their wrappers.

The moved code keeps opening feedback, duplicate-open protection, empty/paused-service checks, retained collection/delivery choice, blackout refresh, loyalty refresh, fresh time assessment, restoration of a still-valid selection, changed-basket detection and totals/display ordering. Live getters preserve mutable bootstrap state; setters update the existing subtotal and remembered-date bindings. Dependency calls preserve their previous unbound semantics. Availability loading feedback stays in the bootstrap because availability can use it before dialog initialization.

No design, menu, pricing, loyalty policy, scheduling engine, submission path, Admin or backend changes are included. In particular, this extraction does not change when the form becomes visible during a scan; that would be a separate behavioural change.

Evidence: CHECKOUT-DIALOG-EXTRACTION-2026-11-19.json. Inverting the documented dependency substitutions reconstructs every extracted region and the entire original checkout script byte for byte, including mixed line endings. Script tests verify once-only ordered classic loading and syntax. Executable controller tests cover startup without side effects, retained delivery and time, loyalty waiting, stale basket rejection, disabled selected times, closing, duplicate opens, paused service and failure feedback. Full website suite: 112 tests pass.

No production deployment. Browser verification was not performed; direct hosted HTTP reads received Cloudflare 403. The closure fix itself has already been deployed separately.
