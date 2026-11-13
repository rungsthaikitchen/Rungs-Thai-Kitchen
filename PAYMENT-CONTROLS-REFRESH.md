# Immediate payment controls after table refresh

Saving a payment starts summary refresh and triggers full order-table reload. The new rows can appear while a previous summary request still holds the listing flag; the refresh was discarded and detached rows received the result. The new rows then retained legacy Mark paid labels until the 30-second interval.

Payment controls now decorate synchronously on table replacement using known row status and cached payment details. Saved payment responses update that cache immediately. Requests made during a running list are coalesced into an immediate follow-up rather than discarded. Each list response updates current rows, not detached nodes. The 30-second poll remains a background reconciliation check.

Validation: 55 website tests pass, including a mounted Admin DOM regression that rebuilds the table with a payment request held open, checks immediate Record payment / Take payment & complete labels, releases the request, verifies immediate queued fetch and cached Payment details on a second rebuild. Single-flight and failure recovery checks also pass. Payment capture, audit and completion backend are unchanged. No real customer payments are made in verification.
