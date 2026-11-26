# Checkout geocoder extraction

Base: 883bfc2678f3b85735d2d6764d73c87c1ebc59d5.

Move the unchanged geocodeCustomerAddress function body into a createGeocoder factory in the existing customer-delivery-quotes.js module. Checkout keeps its compatibility wrapper and reviewed-delivery hook. Factory creation does no I/O. No extra script is added. Both modified scripts receive a cache version update.

Preserve the geocode-address function request, payload, success gate, coordinates, awaited pricing refresh, warning/error handling and existing failure behavior. No address range, geocoder, fee, scheduling or policy changes.

Validation: 248 tests pass without skips/failures. Reconstruction recovers both the released checkout bootstrap and delivery-quotes module byte for byte, chained into previous proofs. Actual factory tests compare query/coordinates/failure behavior with the released body; verify coordinates precede pricing, pricing is awaited, replacement window callback is used, and invoke/pricing exceptions remain caught. Syntax, synchronous loading and whitespace checks pass. Hosted startup evidence is recorded in the PR. No real address lookups or orders submitted.
