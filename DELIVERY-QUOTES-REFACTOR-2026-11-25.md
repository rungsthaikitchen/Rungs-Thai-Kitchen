# Delivery quote extraction

Base: 3d40d29c6011d11db3a45b947a519adfde4e0c20 (PR #121).

Move delivery distance/band helpers, quote refresh and pricing-refresh orchestration into customer-delivery-quotes.js. Shared quote state/generation and configuration remain in the bootstrap through live getters/setters. Existing local/global helper names are preserved. Registration/creation performs no quoting or rendering. Original bodies change only explicit dependency accesses; window.deliveryQuoteState remains the same public field.

DELIVERY-QUOTES-EXTRACTION-2026-11-25.json records exact before/after regions and hashes. Inverse reconstruction verifies the entire released bootstrap, then chains through prior proofs.

Validation: 206 tests pass, zero failures/skips. Existing five stale-reply/threshold/collection tests now run against the actual module and real distance/band helpers. Differential cases cover radius/free/route/fallback branches, invalid provider responses, request payload and rendering callback order. Boundary helper checks cover missing/non-numeric values and fee boundaries. Syntax, classic script order and CRLF-aware whitespace checks pass. Hosted startup checks pending.

No delivery radius, threshold, fee, scheduling, submission or notification changes. Publication awaits user approval.
