# Shadowed helper cleanup

Base: 6681ddcdbe805eaab5d8c251f95a1c981762b63f (PR #123).

Remove the earlier openMenuOverlay, closeMenuOverlay and openCustomiseById declarations. Each occupied the same DOMContentLoaded scope as a later canonical wrapper, so the later declaration already supplied the effective binding. Canonical wrappers, callsites, binding order, aliases and duplicate event listeners remain unchanged.

Retain both getSelectedOrderType declarations: they live in different scopes (global and DOMContentLoaded) and are not interchangeable dead duplicates.

DUPLICATE-HELPERS-CLEANUP-2026-11-25.json records the three exact removed regions, replacements and whole-file hashes. Inverse reconstruction proves no other bootstrap change and chains through earlier extraction checks. Tests compare the effective function before and after removal, including delegation arguments and return value.

Validation: 213 tests pass, no failures/skips. Syntax and CRLF-aware whitespace checks pass. Hosted interaction checks pending. No production release until approval.
