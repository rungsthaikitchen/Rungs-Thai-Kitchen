# Private customer-review warnings

Owner reported RTK-1638 as a no-show on14November: food prepared, unpaid; phone unobtainable and email bounced. The original cancelled/unpaid order and its financial and loyalty fields are preserved. One private customer_review_flags incident links the customer and source order and snapshots normalised contact match keys. The facts are attributed to the owner's report; no fraud or intent is inferred.

Future orders match customer record, UK-normalised phone or trimmed/case-folded email across different customer IDs. Full-name-only matches are explicitly tentative. Blank details do not match. Unrelated earlier orders are excluded; the original source order always shows the incident. Deactivating the incident clears future review warnings without deleting its record. No automatic rejection, customer notice, receipt text or scheduling change is introduced.

New table and RPC are denied to anon/authenticated, use RLS and SECURITY INVOKER, and are readable only through the private backend service role. A signed Cloudflare Access allowlisted staff identity and both existing proxy secrets are required at the read-only API boundary. The backend route is independent of Master Wok and works in LEGACY mode. Browser output uses textContent and is excluded from customer-facing order objects and printing.

Validation: SQL tests run in an isolated schema and roll back all fixtures; phone/email/name/new-customer/blank/historical/cleared matching, request bounds and private grants pass. Production service-role RPC matches the source incident. Five Flask route tests cover private credentials, legacy-mode independence, UUID/batch bounds, duplicate IDs and error redaction.83 website tests cover matching descriptions, signed access and existing ordering. Advisor INFO for RLS without public policies is intentional: no public policy is granted for private flags.

Staff warning lookup is asynchronous, with a30-second cache and an explicit lookup-unavailable message. Admin Refresh clears its cache. Review warnings are advisory, not identity proof. This change does not re-enable Master Wok or send messages.
