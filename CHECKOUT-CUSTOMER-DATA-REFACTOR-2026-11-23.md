# Checkout customer data extraction

Base: c97fe166ca9af65da09bc4d1d3bbd193a3281c6a.

Moves getNextOrderRef and getOrCreateCustomer unchanged into customer-checkout-customer-data.js. The factory receives the existing window and console; each invocation still reads the current window.sb. Bootstrap wrappers preserve the existing submission controller interface. Registration and factory creation do not access the database. No normalization, matching precedence, query payload, collision recovery or error policy changes.

Validation: 151 tests passed with zero failures/skips. Actual module requests/results are compared with the recorded released functions across 15 customer lookup/update/insert/collision/error paths; supported order-number RPC shapes, missing configuration, missing contact fields and live client replacement are also checked. Source reconstruction restores the complete published bootstrap byte for byte. Existing source proofs reverse this change before their historical checks. Once-only synchronous script order and test asset routing include the new file.

All database calls in these tests are mocked. No live customer record, order or notification was created. Hosted startup validation remains pending. This is a draft extraction, not a production deployment.
