-- DRAFT ONLY: do not apply to production until Railway backend is reviewed.
-- RTK payment capture, separate tip method, and append-only correction history.
-- Backend service role only: no browser/anon/authenticated table access.

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  -- One immutable request key for the initial payment capture.
  capture_idempotency_key uuid not null unique,
  bill_amount numeric(10,2) not null check (bill_amount >= 0),
  bill_method text not null check (bill_method in ('cash','card','bank_transfer')),
  tip_amount numeric(10,2) not null default 0 check (tip_amount >= 0),
  tip_method text check (tip_method in ('cash','card','bank_transfer')),
  received_at timestamptz not null default now(),
  recorded_by text not null,
  updated_at timestamptz not null default now(),
  constraint tip_method_consistency check (
    (tip_amount = 0 and tip_method is null) or
    (tip_amount > 0 and tip_method is not null)
  )
);

create table if not exists public.order_payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid references public.order_payments(id) on delete restrict,
  event_type text not null check (event_type in ('recorded','corrected')),
  -- Each logical event must have a unique key, including correction requests.
  event_idempotency_key uuid not null unique,
  previous_details jsonb,
  new_details jsonb not null,
  reason text,
  actor text not null,
  occurred_at timestamptz not null default now(),
  constraint correction_reason_required check (
    event_type <> 'corrected' or nullif(btrim(reason), '') is not null
  )
);

create index if not exists order_payment_events_order_time_idx
  on public.order_payment_events (order_id, occurred_at desc);

alter table public.order_payments enable row level security;
alter table public.order_payment_events enable row level security;
revoke all on public.order_payments from public, anon, authenticated;
revoke all on public.order_payment_events from public, anon, authenticated;

-- No permissive RLS policies. Only a trusted backend using service-role
-- credentials should record payments and corrections.
-- A future backend transaction must:
--   1. Lock the order; validate payable final orders.total and request values.
--   2. Insert the payment record once and append its audit event.
--      A repeated request with the same idempotency key must return the
--      original result without creating a second event. A different key
--      for an already-recorded payment must fail, not overwrite it.
--      Corrections require a distinct action, reason and event key.
--   3. Update orders.paid, payment_status, paid_at and completion status.
--   4. Commit all changes atomically, or roll back all.
-- Do not implement this as multiple independent browser requests.
-- Existing orders are deliberately NOT backfilled or marked paid.
-- Important: unique keys alone are not sufficient for idempotency: the
-- backend must compare canonical request payloads on retries, serialise
-- concurrent requests, and commit payment + event + status atomically.
