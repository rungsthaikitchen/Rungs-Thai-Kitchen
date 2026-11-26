# Checkout pricing event extraction

Base: 08d83e33c0bcd24bd6195a0be27622c0d0c8fdad.

Four listener groups move into createPricingBindings in the existing checkout-events module: preferred-time discount refresh, totals recomputation, standalone order-type totals registration, and discount application. Explicit bind calls remain at each original position. Live getters/setters retain shared discount state. No new script is added.

Only external dependency qualifications and whitespace on empty lines change inside moved code. Existing duplicate order-type totals callbacks, fallback selectors, validation errors, unreachable statements and update order are deliberately preserved. No pricing or discount policy changes.

Validation: 253 tests pass without failures/skips. Source proofs reconstruct the released checkout and events module byte for byte. Actual-module tests cover callback identity/counts, preferred-time refresh, successful/invalid discounts, state/messages, live subtotal/input, delayed validation, rejection and optional/fallback controls. Syntax, synchronous loading and whitespace checks pass. Hosted startup evidence is recorded in the PR. No discount service calls or orders submitted.
