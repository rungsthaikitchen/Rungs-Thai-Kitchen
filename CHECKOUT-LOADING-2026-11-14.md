# Checkout and availability feedback

The private customer preview now immediately displays “Opening checkout…” while service state, blackouts and any retained-date availability load. Duplicate open clicks are ignored and feedback clears on success, early return or failure.

Selecting a date displays “Checking available times…” and an accessible count as bounded availability batches finish. No selected time is enabled until the complete current response validates. Batches are limited to 12 candidate times with at most two requests in flight; failures cancel siblings and no partial list is returned.

The change addresses hosted CPU exhaustion on 14 November's staged commitments. It does not change production or relax cooking, capacity, hold, lead-time or final booking validation.

Validation: 68 website tests cover batching, progress, partial-response rejection, sibling cancellation, stale requests and immediate opening feedback/cleanup. Hosted staging replay of the exact £104.50 basket returned all 61 hints (55 verified) in 16.75 seconds.
