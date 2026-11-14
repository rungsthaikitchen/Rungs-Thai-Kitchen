# Owner-requested legacy rollback — 14 November 2026

Owner requested Master Wok off during service after repeated scheduling and checkout failures. Existing orders, plans, receipts, audit and outbox are preserved. Production control is drained under the authoritative booking advisory lock before the gateway switches to LEGACY. Gateway approval links are disabled. Existing approved-review links must not be used to create legacy bookings.

Railway production project7821ad5b-f5c2-4ab4-9206-c3d76eefd4c8, environmenteb574083-839c-4959-b1b1-8b96c45ce86b, order-backend servicef2eb904f-fc4a-41d0-9073-53a1b42fafe9: MASTER_WOK_BOOKING_MODE=LEGACY; MASTER_WOK_REVIEW_APPROVALS=disabled. The redeployed container was blocked by Brevo IP authorization in its startup preflight. Start command changed to standard python -m gunicorn -c gunicorn.conf.py server:app, separating API availability from email-provider access without changing Brevo protections. Email delivery needs separate verification.

The Admin payment/amendment capability now checks the active gateway booking mode and leaves ordinary controls in place in LEGACY/DRAINING or during an outage. 76 website tests pass. Newer payment/amendment dialogs depend on the disabled writer and are unavailable in this rollback; saved data is retained. Do not reactivate Master Wok automatically or discard unresolved client idempotency keys.

Previous durable state: MASTER_WOK revision8, approved release master-wok-four-ring-2026-11-10. Drain state revision9. Final legacy revision and gateway deployment must be read back before declaring rollback complete.
