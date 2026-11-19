# Explicit closure and basket review

Production incident: a basket review submitted on 18 November at 19:05 requested 20:00, inside the owner's explicit closure. The saved server assessment reported BLACKOUT, but the review was still persisted. This did not create a booking.

The backend now gates the actual review INSERT against authoritative active `closed` windows, with start-inclusive/end-exclusive boundaries. Diagnostic failure cannot bypass it. Identical previously saved requests still replay and conflicting identities remain rejected. Fully booked periods are not treated as business closures.

Checkout suppresses the arrange-order invitation when explicit closures cover the complete service window, asks for another date, and preserves the basket. Partial closures are checked against the requested time. London daylight saving conversion is independent of the browser timezone. The client recognises the server's explicit closure rejection; it allows a fresh request to move to another date while retaining protection for an earlier uncertain reply.

Validation: 106 website tests, 443 backend tests and 11 rolled-back private SQL checks. The temporary staging endpoint was disabled. No real customer review was modified and no messages were sent.

This fix is separate from the unpublished checkout-dialog refactor. Booking rules, prices, loyalty, capacity and the Admin review status workflow are unchanged.
