# Clear completed review approvals

Browser reproduction in the protected availability preview:

1. Submitted an approved £48 delivery basket for 20 November at 19:30.
2. Saw staging order RTK-211 succeed; SQL confirmed the approval was consumed.
3. Started a fresh basket with one Prawn Crackers portion and chose collection.
4. The previous holding checkbox remained checked. Availability then failed with
   “The agreed-time link is invalid or expired.”

The global approved-review state and controls survived successful checkout. A
subsequent basket therefore attempted to reuse the consumed approval token.

Clear the token, holding checkbox and approval notice only after the booking
client validates a successful committed/replayed receipt. Preserve them on a
known rejection or unknown outcome, keeping safe retry/idempotency behaviour.
Starting another approval restore also clears old controls and invalidates any
in-flight restore. Review failures now have actionable customer messages.

Validation: 87 Node tests pass, including successful approval cleanup, uncertain
outcome retention and known rejection retention. Browser recheck pending.
No production deployment; staging scheduling candidate only.
