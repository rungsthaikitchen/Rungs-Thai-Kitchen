# Preview availability diagnosis — 28 November 2026

## Finding

The 27 November preview failure is reproducible using the deployed staging engine and the current private staging snapshot for 28 November. The saved service plan fails the deployed engine's committed-plan validation. This is independent of the customer compatibility cleanup in PR147.

The replay is local and read-only: no backend calls, bookings, notifications, database writes, or live-mode changes were performed.

## Evidence

- Website baseline: main `5098e1111991dd09a793bbaf3fd4a1ee2dd51caf`; all 271 customer tests pass.
- Staging gateway deployment `aaf9c45f-a68d-45ba-9b27-e2dd2358dbce` is successful. Its 27 November availability requests returned HTTP 200. A successful HTTP response does not prove that any hint was verified.
- Deployed staging `master-wok-booking` function: version 92; source SHA `dd83e83365b87d93fb32720719d5d698d179657a9284a646a67661744f8502df`.
- Private rehearsal service state is normal, throttle zero, with no expiry.
- Two active rehearsal commitments exist on 28 November: RTK-188 at 20:15 and RTK-189 at 18:30. Both have the staging fixture key prefix and an `example.invalid` customer email.
- Saved plan revision 2 reports model `combined-kitchen-four-ring-staging-v1`.
- The deployed `validateRingOccupancy` rejects that saved plan with `INVALID_VESSEL` for `salt-chips` and two `HOB_FOOTPRINT_CONFLICT` issues. In particular, the plan puts `salt-chips` in `small-1` and overlaps small-wok work with both large woks.
- `protectStartedWork` turns these validation issues into `COMMITTED_PLAN_RESOURCE_CLASH`; the release assessor hides this internal detail as `RELEASE_ASSESSMENT_NOT_VERIFIED`.

## Controlled local replay

Input: one `veg-spring-rolls`, no modifiers, collection; times 17:00, 18:30, 20:00 on 28 November. The clock was fixed to 27 November 08:16 UTC, matching the observed preview request period. Current snapshot data was used; this is not a claim to possess the exact historical snapshot.

| Snapshot | Result at all three sampled times |
| --- | --- |
| Two existing commitments and saved plan | Unverified: `COMMITTED_PLAN_RESOURCE_CLASH` |
| Same commitments without saved plan | Unverified: `SEARCH_LIMIT` |
| No commitments and no saved plan | Available: `CERTIFIED_RELEASE_CAPACITY` |

The replay used the actual deployed bundled modules. The delivery component's route callback was set to throw if called; all existing commitments and the candidate were collection, so no route provider was needed. No booking authorization was issued by availability.

## Consequence and next change boundary

Do not bypass validation, silently delete the saved plan, or route previews to the live Legacy backend. Removing only the plan is insufficient: the bounded search also cannot reconstruct these commitments at the sampled times.

A clean isolated service date can validate the customer journey without modifying these fixtures. Restoring this particular rehearsal date requires a validated replacement plan or explicit fixture retirement, with order/plan consistency preserved. The originating writer of the incompatible saved plan has not yet been established.

The live site's Legacy route remains unchanged. Routing values were last observed through browser checks on 27 November; this investigation did not independently refresh them on 28 November.

## Follow-up: clean date and repair feasibility

- Read-only database checks confirmed 5 December 2026 has zero active commitments, no saved plan and no active overlapping blackout in rehearsal.
- With the deployed bundled engine, one vegetable spring-roll basket and a fixed 28 November 07:00 UTC clock, all 49 five-minute collection times from 17:00 through 21:00 on 5 December passed. No hint was unverified. Local runtime was approximately 101 ms; this is not network or browser timing.
- The replay used an in-memory snapshot and bypassed transport and launch-control checks. It validates the assessment engine, not the deployed preview end to end. Browser automation was not available in this continuation, so the clean-date browser journey remains outstanding.
- The incompatible 28 November plan was last updated on 10 November at 07:09:41 UTC. It predates the deployed function version. This establishes age, not which writer originally created the incompatibility.
- An independent local rebuild of the two existing commitments, without the saved plan, also exhausted the full replan search (`SEARCH_LIMIT`, approximately 3.1 seconds). No valid replacement plan was produced, so no repair was applied.
- No production or staging records, settings or deployments were changed.

Next validation: use the existing PR147 preview, one vegetable spring-roll basket, Collection, 5 December 2026. Check availability only; do not submit an order. If it passes, retain these old fixtures as evidence and agree a scoped staging-data refresh separately rather than weakening the safety checks.

## Authorized scoped fixture refresh

The owner confirmed all times available on 5 December in the preview browser, then authorized the scoped staging-fixture refresh and repeat availability check with existing orders.

Historical source evidence in `order-backend/BASKET-REVIEW-STAGING.md` identifies RTK-188 and RTK-189 as synthetic £150 mixed and starter/curry bookings from the 10 November hosted test. Current private-schema records and synthetic customer markers match that origin.

Before mutation, the exact saved plan and prior order test flags were preserved at `evidence/staging-refresh-2026-11-28/retired-fixture-plan.json` on branch `diagnostics/staging-fixture-refresh-20261128`, commit `51ee55dd58ff6061f7469a7d3d6c9fb517df8c6e`.

A single direct-SQL transaction acquired the existing global kitchen writer lock and the 28 November service-date lock. Guards required the private rehearsal project, direct maintenance role, unchanged MASTER_WOK mode, exactly the two known pending fixtures with synthetic key/email markers, no other active date commitments, and the exact saved plan revision 2 / MD5 `e05c0b4d6e459a70448e7665221e1139`.

The transaction set `is_test=true` on exactly those two order IDs and removed exactly that saved service-plan row. It retained order headers, statuses, baskets, customer records, booking receipts and notification history. No launch mode, schema, function, website, production record or production deployment was changed. The existing database writer fence remained enabled; only the transaction-local direct-writer context was used for this authorized maintenance operation.

Post-write verification: two retained pending fixtures marked test, zero active 28 November commitments, no saved plan for that date, launch mode still MASTER_WOK, and the separate 3 December collection commitment retained.

### Client-to-engine local checks after refresh

Actual website checkout client and deployed staging engine modules were wired together in memory; the client performed its normal four batches and completed progress to 49/49. These are local integration checks, not hosted latency or browser checks. No submit call, route-provider request or notification was made.

| Service date | Existing commitments | Available / 49 | Unverified | Local elapsed |
| --- | --- | --- | --- | --- |
| 28 November (refreshed) | 0 | 49 | 0 | 142 ms |
| 3 December (untouched saved snapshot) | 1 collection order, 11 wok jobs | 49 | 0 | 69 ms |

Candidate basket in both checks: one vegetable spring-roll portion, collection. This verifies the saved-plan failure is removed from the refreshed date and that a compatible existing plan can be assessed. It is not a capacity stress certification or an end-to-end hosted booking test.

Next browser confirmation: same preview, one vegetable spring roll, Collection, 3 December; check times without submitting. A browser check of 28 November will also depend on the real current time and same-day lead/cutoff rules.

Rollback is possible using the preserved plan and original test flags, but must acquire the same locks and refuse to run if new commitments or a replacement plan now exist. Do not blindly restore an incompatible plan over later bookings.
