"""Disposable PostgreSQL-backed LEGACY payment HTTP contract fixture."""
import os
import sys
from pathlib import Path
from flask import Flask
import psycopg2

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"backend"))
from master_wok_routes import register_master_wok_routes

DSN=os.environ["LEGACY_TEST_POSTGRES_DSN"]
ORDER_ID="00000000-0000-4000-8000-000000000001"
SCHEMA="""
CREATE TABLE public.orders (
 id uuid PRIMARY KEY, total numeric(12,2), status text NOT NULL,
 paid boolean, capacity_scheduler text NOT NULL,
 payment_status text NOT NULL DEFAULT 'unpaid', paid_at timestamptz
);
CREATE TABLE public.order_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
 capture_idempotency_key uuid NOT NULL UNIQUE,
 bill_amount numeric NOT NULL CHECK(bill_amount >= 0),
 bill_method text NOT NULL CHECK(bill_method IN ('cash','card','bank_transfer')),
 tip_amount numeric NOT NULL CHECK(tip_amount >= 0),
 tip_method text,
 received_at timestamptz NOT NULL DEFAULT now(),
 recorded_by text NOT NULL, previously_marked_paid boolean NOT NULL,
 CHECK ((tip_amount = 0 AND tip_method IS NULL) OR
        (tip_amount > 0 AND tip_method IS NOT NULL))
);
CREATE TABLE public.order_payment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.orders(id),
 payment_id uuid NOT NULL REFERENCES public.order_payments(id),
 event_idempotency_key uuid NOT NULL UNIQUE,
 event_type text NOT NULL CHECK(event_type='recorded'),
 new_details jsonb NOT NULL,
 actor text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 request_fingerprint text NOT NULL, response jsonb NOT NULL
);
"""
connection=psycopg2.connect(DSN)
with connection:
    with connection.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS public.order_payment_events,public.order_payments,public.orders CASCADE")
        cur.execute(SCHEMA)
        cur.execute("INSERT INTO public.orders(id,total,status,paid,capacity_scheduler) VALUES (%s,32.50,'completed',false,'LEGACY')",(ORDER_ID,))
connection.close()

class Gateway:
    def enabled(self): return False

app=Flask(__name__)
environ={"LEGACY_PAYMENT_RECORDING":"enabled","MASTER_WOK_REVIEW_ADMIN_SECRET":"s"*40,
         "RTK_PROXY_SECRET":"p"*40}
register_master_wok_routes(app,environ,lambda response:response,
                           lambda *args,**kwargs:None,gateway=Gateway(),
                           legacy_payment_connection_factory=lambda:psycopg2.connect(DSN))
if __name__=="__main__":
    app.run(host="127.0.0.1",port=18766,use_reloader=False)
