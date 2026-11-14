# Checkout and availability feedback

The private customer preview now immediately displays “Opening checkout…” while service state, blackouts and any retained-date availability load. Duplicate open clicks are ignored and feedback clears on success, early return or failure.

Selecting a date displays “Checking available times…” and an accessible count as bounded availability batches finish. No selected time is enabled until the complete current response validates. Batches are limited to six candidate times with at most two requests in flight; failures cancel siblings and no partial list is returned.

The change addresses hosted CPU exhaustion on 14 November's staged commitments. It does not change production or relax cooking, capacity, hold, lead-time or final booking validation.

Validation: 68 website tests cover batching, progress, partial-response rejection, sibling cancellation, stale requests and immediate opening feedback/cleanup. Hosted staging replay of the exact £104.50 basket returned all 61 hints (55 verified) in 16.75 seconds.

The first 12-hint version passed a single browser run but subsequently failed for the owner: a reused worker exceeded CPU at 2.739 seconds. This is not treated as a passed reliability check. Reduce to six hints per batch and retry a transient failed availability read once (502/503/504/546 only). Booking submissions are untouched by this retry.

Repeated read-only hosted runs through the real checkout client: three consecutive full-day searches each returned 61 hints and 55 verified times, in 11.006s, 3.266s and 3.412s. All 36 HTTP calls returned 200. Website tests now total 70, including bounded transient retry and persistent-error termination. Final browser repetition is recorded separately after deployment.
