# Refresh delivery quotes when checkout reopens

Separate behavior fix based on production `8f3cae1`, independent of pricing extraction PR #103. Reopening now commits the current subtotal, awaits the existing pricing/quote refresh, then displays checkout only if the basket still matches. Existing opening feedback and duplicate-open guard remain active while pricing loads. No change to prices, radius, free-delivery threshold, loyalty or booking authority.

Each delivery quote gets a generation. A newer quote or Collection switch supersedes older route responses; stale successful and failed replies cannot overwrite the current fee. Current failure still uses the existing fallback fee. Synchronous missing-coordinate, radius and free-delivery branches retain their existing order.

Validation: 135 website tests pass. New tests cover stale successful reply after reaching £30, charging again after dropping below £30, late failures after switching to Collection, out-of-order route replies, missing coordinates/radius gates, awaiting pricing before showing checkout, and basket changes during that wait. Provider calls are mocked and no test orders are required.

The historical dialog-extraction proof explicitly reverses the recorded before/after behavior change only for source reconstruction; functional tests execute the actual current dialog. This fix is not claimed to be behavior-preserving.

Draft pending hosted verification and owner approval to deploy. Production unchanged.
