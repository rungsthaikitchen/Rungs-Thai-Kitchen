# Checkout address requirement wiring

Base: a7f34a12b437fefbe9bf0d8d702c56a37b1562a5.

The existing updateAddressRequirement helper was defined but never called. Invoke it once after the display controller is initialized, before opening checkout, and immediately in the existing order-type change listener before any asynchronous pricing or availability work. Delivery now sets the native address required flag and full-opacity hint; Collection removes the flag and dims the hint. No geocoding, radius, pricing, booking or server-validation changes.

Validation: 159 tests pass with zero failures/skips. New tests execute the actual startup call, opening wrapper and order-type listener with the actual display module, including retained Delivery and switching back to Collection while checks are pending. Historical extraction proofs undo only the recorded wiring edits before comparing their older baseline. Syntax and CRLF-aware whitespace checks passed. Hosted check pending. No order, identity or notification created. Draft only; not deployed.
