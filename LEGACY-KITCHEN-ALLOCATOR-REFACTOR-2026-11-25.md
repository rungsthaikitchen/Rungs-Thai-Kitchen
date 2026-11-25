# Legacy kitchen production allocator extraction

Base: 6bf5bf9c8b2775a1930ea1f151b0e9dbf6b0b5eb (PR #127).

Move getKitchenStartForDate, getLatestProductionSlotStart, allocateLoadBackwards and forceAllocateExistingLoad into customer-legacy-kitchen-allocator.js. The four original bodies are copied unchanged. Inject the existing immutable timing constants; keep compatibility wrappers, all callsites, maps and database/time-eligibility logic in the checkout bootstrap. Registration/creation has no DOM, network or scheduling effects.

LEGACY-KITCHEN-ALLOCATOR-EXTRACTION-2026-11-25.json records exact original bodies and hashes. Inverse reconstruction proves the entire released checkout bootstrap and chains through earlier extraction proofs.

Validation: 226 tests pass, zero failures/skips. Actual module matches released helpers across six ready-time boundaries, 135 reservation cases (ready time/load/occupied-map combinations) and 32 forced existing-commitment cases. Failure leaves maps untouched; successful reservation preserves supplied map identity. Tests retain existing early-boundary truncation/conflict records and exercise the current basket-fit function with the extracted allocator to prove the live map is unchanged. Syntax, synchronous loading and whitespace checks pass. Hosted startup checks pending.

This is the legacy browser allocator, not Master Wok. No kitchen start, step length, capacity, opening/overrun, scheduling choice, order submission, database, feature flag or notification changes. Publication awaits user approval.
