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

The fresh preview also exposed a delivery-specific restore bug: setting the
address and dispatching `change` did not invoke its existing `blur` geocoder.
An approval opened in a fresh session therefore retained missing coordinates
and a fallback delivery fee. Explicitly await the existing address lookup and
pricing refresh before applying the agreed time; abandon obsolete restores
after asynchronous steps.

Validation: 89 Node tests pass, including successful approval cleanup, uncertain
outcome retention, known rejection retention, delivery quote sequencing and
cancellation during the quote. Protected preview recheck passed at website
commit 9599503 against staging Edge version 77: a fresh-session approval
automatically verified the public landmark address, retained free delivery and
the £48 total, and created RTK-212 for 20 November at 20:30. Its approval was
consumed once. A subsequent Prawn Crackers collection basket had zero holding
checkboxes and all 49 normal-window times available, with no expired-link error.

Screenshots and the credential-free check summary are in `tests/evidence/`.
No production deployment; staging scheduling candidate only.
