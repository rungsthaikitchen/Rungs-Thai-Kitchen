# Availability batch isolation

Live availability checks hit CPU limits after commitments accumulated. One failed six-time batch discarded all successfully verified hints. Transient 502/503/504/546 and transport/JSON failures now receive at most one read-only retry, then mark exactly that batch unavailable and unverified. Other batches remain usable. Superseded requests still cancel, malformed successful contracts and non-transient errors still fail closed, and booking writes are unchanged.

71 website tests pass, including persistent CPU failure with non-JSON error body, preservation of later verified hints, concurrency cap and cancellation. Exact £29 basket (chicken Pad Thai, chicken Chef Pad Thai, chicken green curry, jasmine rice) locally passes full validators at 18:15/18:20/18:25/18:30 against saved 14 November reservations. This replay creates no booking or notification; live checkout remains the authoritative final check.
