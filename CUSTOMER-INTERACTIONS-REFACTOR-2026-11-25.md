# Customer interaction wiring extraction

Base: 2d2b3aed915bba88dbed3a052ab6b4defc8b8097 (PR #126).

Move the two delegated customisation click groups and the shared Escape handler into customer-interactions.js. Each group binds at its original bootstrap position. Shared callbacks and dialog references use live getters. Preserve the early binding guard, global opener fallback, button/card selectors, duplicate click behaviour and Escape callback ordering. Do not consolidate listeners in this step.

CUSTOMER-INTERACTIONS-EXTRACTION-2026-11-25.json records original/revised bodies, initialization and hashes. Inverse reconstruction proves the complete released bootstrap and chains through prior proofs.

Validation: 221 tests pass, no failures/skips. Actual module is compared with released handlers for button/card/irrelevant targets, empty IDs, existing binding markers, missing menu, global fallback, visibility gates, absent callbacks and Escape/other keys. Registration/creation has no DOM effects. Syntax, synchronous loading and whitespace checks pass. Hosted interaction checks pending.

No menu, ordering, pricing, scheduling or notification changes. Publication awaits user approval.
