# Menu overlay controls extraction

Base: 098115c6f784b86a4d667100c862a7539c7aac80 (PR #119).

Move effective menu open/close functions and both existing listener groups into customer-menu-overlay.js. Bootstrap wrappers preserve hoisted function resolution and both binding groups execute at their original positions. Earlier shadowed helpers remain unchanged. Shared basket and DOM references use live getters; no listener deduplication or accessibility behaviour changes are included.

MENU-OVERLAY-EXTRACTION-2026-11-25.json records original and dependency-adjusted bodies. Inverse reconstruction verifies the entire released bootstrap, then chains through previous proofs.

Validation: 199 tests pass, zero failures/skips. Actual module is compared with released functions for nav/FAB opening, scroll locking, close button, Escape, backdrop versus child clicks, original listener counts, optional controls, scroll threshold and empty/current basket handoff. The subtotal test uses a replaced basket and verifies the menu closes before checkout is called. Registration and creation defer DOM work. Loading order, syntax and CRLF-aware whitespace checks pass. Hosted checks pending.

No menu, basket, pricing, scheduling, order submission or notification policy changes. No production release until approval.
