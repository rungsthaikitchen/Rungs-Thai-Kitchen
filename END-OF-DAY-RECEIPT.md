# End of day reconciliation receipt

Read-only Admin action, using existing protected payment-list transport. No schema, scheduler, payment writer or Railway changes.

Select a UK service date; confirmed fulfilment time wins over requested time. Unaccepted proposed times do not move revenue between service dates. Test orders excluded. Completed order sales and recorded payments are separate totals. Cash/card/bank-transfer bills and tips are separated. Opening float, cash expenses and removals are not tracked. Optional counted cash is takings including cash tips. Refunds are not modelled: cancelled orders with payments remain in received totals and are explicitly flagged for review. This is a service reconciliation, not a bank settlement or payment capture date report.

Order reads paginate in batches of 500 with a hard refusal above 10,000 candidate rows; payment reads batch at 60 and require an entry for every included order. Errors never produce a partial receipt. Preview uses the existing staging-only order client, never production Supabase. The browser builds a read-only report from successive reads; concurrent changes may require rebuilding before printing. Reprints are not immutable close-of-day records.

Printing: browser print dialogue, 80mm paper, 72mm receipt content; one copy. No automatic cash drawer or printer commands. Actual Epson TM-T20IV print acceptance remains required.

Validation: node --test master-wok-reconciliation.test.js (9 passing). Hosted preview and real printer acceptance pending. Production deployment requires owner approval. Rollback is removal of the two additive script references; financial records are untouched.
