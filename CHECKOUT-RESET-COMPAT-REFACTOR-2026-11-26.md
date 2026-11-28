# Checkout reset compatibility extraction

Base: 12c30dcf78c0badbbf71cb1edecc5a3a810cd3d1.

Move the remaining checkout reset and retry-key bodies into createCheckoutCompatibility in the existing customer-checkout-reset.js module. Keep compatibility wrappers and original shared state in checkout. The existing menu-side factory remains unchanged. No new script is added.

Only shared dependency accesses change; original bodies and behavior are preserved. Customer-field clearing, discount resets, last-date reset, public delivery quote reset, preferred message handling and local-storage key removal remain identical. Retry keys are reused until reset, then generated on next request. Date input, coordinates and unrelated storage retain their existing values. No attempt to unify the two reset implementations is made in this extraction.

Validation: 257 tests pass without skips/failures. Source proofs reconstruct both released files byte for byte. Actual factory tests compare released reset behavior and call order, missing fields/fallback discount controls, storage key reuse/reset/recreation and storage exceptions. Syntax, script loading and whitespace checks pass. Hosted startup evidence is recorded in the PR. No orders submitted.
