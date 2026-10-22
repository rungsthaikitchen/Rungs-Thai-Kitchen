-- Isolated schema constraint smoke test; intended for staging only.
-- This does NOT test the Railway transaction or production schema integration.
-- Run in a disposable SQL session. Everything is rolled back.
begin;
create temp table test_orders (id uuid primary key);
create temp table test_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references test_orders(id),
  capture_idempotency_key uuid not null unique,
  bill_amount numeric(10,2) not null check (bill_amount >= 0),
  bill_method text not null check (bill_method in ('cash','card','bank_transfer')),
  tip_amount numeric(10,2) not null default 0 check (tip_amount >= 0),
  tip_method text check (tip_method in ('cash','card','bank_transfer')),
  constraint tip_method_consistency check (
    (tip_amount = 0 and tip_method is null) or
    (tip_amount > 0 and tip_method is not null)
  )
);
create temp table test_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references test_orders(id),
  payment_id uuid references test_payments(id),
  event_type text not null check (event_type in ('recorded','corrected')),
  event_idempotency_key uuid not null unique,
  previous_details jsonb,
  new_details jsonb not null,
  reason text,
  actor text not null,
  constraint correction_reason_required check (
    event_type <> 'corrected' or nullif(btrim(reason), '') is not null
  )
);
insert into test_orders values ('00000000-0000-4000-8000-000000000001');
insert into test_payments(order_id,capture_idempotency_key,bill_amount,bill_method,tip_amount,tip_method)
values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',14.70,'card',2.00,'cash');
insert into test_events(order_id,payment_id,event_type,event_idempotency_key,new_details,actor)
select order_id,id,'recorded','00000000-0000-4000-8000-000000000003',
       '{"bill":"14.70","tip":"2.00"}'::jsonb,'staging-test' from test_payments;
do $$
declare failures integer := 0;
begin
  -- Every deliberately invalid statement is caught and must fail.
  begin
    insert into test_payments(order_id,capture_idempotency_key,bill_amount,bill_method)
    values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004',14.70,'cash');
    failures := failures + 1;
  exception when unique_violation then null; end;
  begin
    update test_payments set tip_amount = -1 where bill_amount = 14.70;
    failures := failures + 1;
  exception when check_violation then null; end;
  begin
    update test_payments set tip_method = null where tip_amount > 0;
    failures := failures + 1;
  exception when check_violation then null; end;
  begin
    update test_payments set bill_method = 'cheque' where bill_amount = 14.70;
    failures := failures + 1;
  exception when check_violation then null; end;
  begin
    insert into test_events(order_id,event_type,event_idempotency_key,new_details,actor)
    values ('00000000-0000-4000-8000-000000000001','corrected',
            '00000000-0000-4000-8000-000000000005','{}','staging-test');
    failures := failures + 1;
  exception when check_violation then null; end;
  begin
    insert into test_events(order_id,event_type,event_idempotency_key,new_details,actor)
    values ('00000000-0000-4000-8000-000000000001','recorded',
            '00000000-0000-4000-8000-000000000003','{}','staging-test');
    failures := failures + 1;
  exception when unique_violation then null; end;
  if failures <> 0 then raise exception 'Smoke test failed: % invalid writes accepted', failures; end if;
  if (select count(*) from test_payments) <> 1 then raise exception 'Unexpected payment count'; end if;
  raise notice 'PASS: six constraint rejection checks, one valid payment and event';
end $$;
rollback;
