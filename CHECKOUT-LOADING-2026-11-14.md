# Checkout and availability feedback

The private customer preview now immediately displays “Opening checkout…” while service state, blackouts and any retained-date availability load. Duplicate open clicks are ignored and feedback clears on success, early return or failure.

Selecting a date displays “Checking available times…” and an accessible count as bounded availability batches finish. No selected time is enabled until the complete current response validates. Batches are limited to six candidate times with at most two requests in flight; failures cancel siblings and no partial list is returned.

The change addresses hosted CPU exhaustion on 14 November's staged commitments. It does not change production or relax cooking, capacity, hold, lead-time or final booking validation.

Validation: 68 website tests cover batching, progress, partial-response rejection, sibling cancellation, stale requests and immediate opening feedback/cleanup. Hosted staging replay of the exact £104.50 basket returned all 61 hints (55 verified) in 16.75 seconds.

The first 12-hint version passed a single browser run but subsequently failed for the owner: a reused worker exceeded CPU at 2.739 seconds. This is not treated as a passed reliability check. Reduce to six hints per batch and retry a transient failed availability read once (502/503/504/546 only). Booking submissions are untouched by this retry.

Repeated read-only hosted runs through the real checkout client: three consecutive full-day searches each returned 61 hints and 55 verified times, in 11.006s, 3.266s and 3.412s. All 36 HTTP calls returned 200. Website tests now total 70, including bounded transient retry and persistent-error termination. Final browser repetition is recorded separately after deployment.

Final browser validation on the rolling branch preview: exact six-line £104.50 basket; three consecutive complete searches (initial date selection, refresh, then close/reopen checkout) each returned 44 verified normal-service times and five explicitly unverified choices. The selected 18:30 remained selected after reopening. Opening feedback was immediately visible. No customer details were entered and no order was submitted.

The verification window still included transient worker-limit responses (aggregate Edge logs 08:25–08:29 UTC: 55 HTTP 200, two HTTP 546). These are not claimed eliminated: the bounded read-only retry allows the user-visible checks to complete. This is a resilience fix rather than proof of unlimited scheduler compute. Production is unchanged.

Rolling review URL: https://fix-basket-availability-2026.rungsthaikitchen.pages.dev/
