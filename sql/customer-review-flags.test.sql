BEGIN;
CREATE SCHEMA customer_review_test;
CREATE TABLE customer_review_test.customers(id uuid PRIMARY KEY,phone text,email text,full_name text);
CREATE TABLE customer_review_test.orders(id uuid PRIMARY KEY,customer_id uuid,order_ref text,preferred_time timestamptz,confirmed_time timestamptz,created_at timestamptz);
GRANT USAGE ON SCHEMA customer_review_test TO service_role;
GRANT SELECT ON customer_review_test.customers,customer_review_test.orders TO service_role;

CREATE TABLE customer_review_test.customer_review_flags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid REFERENCES customer_review_test.customers(id) ON DELETE SET NULL,
 source_order_id uuid NOT NULL REFERENCES customer_review_test.orders(id) ON DELETE RESTRICT,
 event_type text NOT NULL CHECK(event_type='NO_SHOW'),
 occurred_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recorded_by text NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 500),
 phone_key text, email_key text, name_key text,
 food_prepared boolean NOT NULL DEFAULT false,
 unpaid boolean NOT NULL DEFAULT false,
 phone_unobtainable boolean NOT NULL DEFAULT false,
 email_bounced boolean NOT NULL DEFAULT false,
 active boolean NOT NULL DEFAULT true,
 UNIQUE(source_order_id,event_type)
);
ALTER TABLE customer_review_test.customer_review_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON customer_review_test.customer_review_flags FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON customer_review_test.customer_review_flags TO service_role;
CREATE INDEX customer_review_phone_idx ON customer_review_test.customer_review_flags(phone_key) WHERE active;
CREATE INDEX customer_review_email_idx ON customer_review_test.customer_review_flags(email_key) WHERE active;
CREATE INDEX customer_review_name_idx ON customer_review_test.customer_review_flags(name_key) WHERE active;
CREATE INDEX customer_review_customer_idx ON customer_review_test.customer_review_flags(customer_id) WHERE active;

CREATE FUNCTION customer_review_test.staff_review_phone_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE SECURITY INVOKER SET search_path=pg_catalog AS $$
 WITH digits AS (SELECT regexp_replace(value,'[^0-9]','','g') AS n),
 international AS (SELECT CASE WHEN n LIKE '0044%' THEN substring(n FROM 3) ELSE n END AS n FROM digits),
 canonical AS (SELECT CASE WHEN n ~ '^0[1-9][0-9]{9}$' THEN '44'||substring(n FROM 2)
  WHEN n ~ '^440[0-9]{10}$' THEN '44'||substring(n FROM 4) ELSE n END AS n FROM international)
 SELECT CASE WHEN length(n) BETWEEN 8 AND 15 THEN n ELSE NULL END FROM canonical;
$$;
REVOKE ALL ON FUNCTION customer_review_test.staff_review_phone_key(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION customer_review_test.staff_review_phone_key(text) TO service_role;

CREATE FUNCTION customer_review_test.staff_customer_review_matches(order_ids uuid[]) RETURNS TABLE(order_id uuid,matches jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF coalesce(cardinality(order_ids),0)>100 THEN RAISE EXCEPTION 'TOO_MANY_ORDER_IDS'; END IF;
 RETURN QUERY
 WITH candidates AS (
  SELECT o.id,o.customer_id,coalesce(o.confirmed_time,o.preferred_time,o.created_at) AS booked_at,
   customer_review_test.staff_review_phone_key(c.phone) AS phone_key,nullif(lower(btrim(c.email)),'') AS email_key,
   nullif(lower(regexp_replace(btrim(c.full_name),'[[:space:]]+',' ','g')),'') AS name_key
  FROM customer_review_test.orders o LEFT JOIN customer_review_test.customers c ON c.id=o.customer_id WHERE o.id=ANY(order_ids)
 ), matching AS (
  SELECT o.id AS oid,f.id AS flag_id,f.reason,f.occurred_at,s.order_ref,f.food_prepared,f.unpaid,f.phone_unobtainable,f.email_bounced,
   array_remove(ARRAY[
    CASE WHEN o.id=f.source_order_id THEN 'source_order' END,
    CASE WHEN o.customer_id=f.customer_id THEN 'customer_record' END,
    CASE WHEN o.phone_key=f.phone_key THEN 'phone' END,
    CASE WHEN o.email_key=f.email_key THEN 'email' END],NULL) AS exact,
   o.name_key=f.name_key AND length(o.name_key)>=6 AND o.name_key LIKE '% %' AS name_match
  FROM candidates o JOIN customer_review_test.customer_review_flags f ON f.active AND
   (o.id=f.source_order_id OR o.booked_at>=f.occurred_at) AND
   (o.id=f.source_order_id OR o.customer_id=f.customer_id OR o.phone_key=f.phone_key OR o.email_key=f.email_key OR
    (o.name_key=f.name_key AND length(o.name_key)>=6 AND o.name_key LIKE '% %'))
   JOIN customer_review_test.orders s ON s.id=f.source_order_id
 )
 SELECT m.oid,jsonb_agg(jsonb_build_object('flagId',m.flag_id,'sourceOrderRef',m.order_ref,'occurredAt',m.occurred_at,
  'reason',m.reason,'matchTypes',CASE WHEN cardinality(m.exact)>0 THEN m.exact ELSE ARRAY['name'] END,
  'possibleMatch',cardinality(m.exact)=0,'foodPrepared',m.food_prepared,'unpaid',m.unpaid,
  'phoneUnobtainable',m.phone_unobtainable,'emailBounced',m.email_bounced) ORDER BY m.occurred_at DESC,m.flag_id)
 FROM matching m GROUP BY m.oid;
END;
$$;
REVOKE ALL ON FUNCTION customer_review_test.staff_customer_review_matches(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION customer_review_test.staff_customer_review_matches(uuid[]) TO service_role;

INSERT INTO customer_review_test.customers VALUES
('00000000-0000-4000-8000-000000000001','07700900123','person@example.invalid','Test Person'),
('00000000-0000-4000-8000-000000000002','+44 (0)7700 900123','other@example.invalid','Other Person'),
('00000000-0000-4000-8000-000000000003',null,' PERSON@EXAMPLE.INVALID ','Different Person'),
('00000000-0000-4000-8000-000000000004',null,null,' test   PERSON '),
('00000000-0000-4000-8000-000000000005','', '',null);
INSERT INTO customer_review_test.orders
SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 ('00000000-0000-4000-8000-'||lpad((CASE WHEN n=6 THEN 2 ELSE n END)::text,12,'0'))::uuid,
 'SYNTHETIC-'||n,CASE WHEN n=6 THEN '2025-01-01'::timestamptz ELSE '2026-11-16'::timestamptz END,null,'2026-11-15'::timestamptz
FROM generate_series(1,6) n;
INSERT INTO customer_review_test.customer_review_flags(customer_id,source_order_id,event_type,occurred_at,recorded_by,reason,phone_key,email_key,name_key,food_prepared,unpaid,phone_unobtainable,email_bounced)
VALUES('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','NO_SHOW','2026-11-14','Synthetic test','Food prepared; no-show; unpaid; contact attempts unsuccessful.','447700900123','person@example.invalid','test person',true,true,true,true);
DO $$ DECLARE x jsonb; BEGIN
 IF customer_review_test.staff_review_phone_key('07700 900123')<>'447700900123' OR customer_review_test.staff_review_phone_key('0044 7700 900123')<>'447700900123' OR customer_review_test.staff_review_phone_key('+44 (0)7700 900123')<>'447700900123' OR customer_review_test.staff_review_phone_key('') IS NOT NULL THEN RAISE EXCEPTION 'PHONE_NORMALISATION_FAILED'; END IF;
 SELECT matches->0 INTO x FROM customer_review_test.staff_customer_review_matches(ARRAY['00000000-0000-4000-8000-000000000002']::uuid[]);
 IF x->'matchTypes'<>'["phone"]'::jsonb OR x->>'possibleMatch'<>'false' THEN RAISE EXCEPTION 'NEW_CUSTOMER_PHONE_MATCH_FAILED'; END IF;
 SELECT matches->0 INTO x FROM customer_review_test.staff_customer_review_matches(ARRAY['00000000-0000-4000-8000-000000000003']::uuid[]);
 IF x->'matchTypes'<>'["email"]'::jsonb THEN RAISE EXCEPTION 'EMAIL_MATCH_FAILED'; END IF;
 SELECT matches->0 INTO x FROM customer_review_test.staff_customer_review_matches(ARRAY['00000000-0000-4000-8000-000000000004']::uuid[]);
 IF x->'matchTypes'<>'["name"]'::jsonb OR x->>'possibleMatch'<>'true' THEN RAISE EXCEPTION 'POSSIBLE_NAME_MATCH_FAILED'; END IF;
 IF EXISTS(SELECT 1 FROM customer_review_test.staff_customer_review_matches(ARRAY['00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000006']::uuid[])) THEN RAISE EXCEPTION 'EMPTY_OR_HISTORICAL_MATCH_FAILED'; END IF;
 IF has_table_privilege('anon','customer_review_test.customer_review_flags','SELECT') OR has_table_privilege('authenticated','customer_review_test.customer_review_flags','SELECT') OR has_function_privilege('anon','customer_review_test.staff_customer_review_matches(uuid[])','EXECUTE') OR has_function_privilege('authenticated','customer_review_test.staff_customer_review_matches(uuid[])','EXECUTE') THEN RAISE EXCEPTION 'PUBLIC_FLAG_ACCESS'; END IF;
 IF NOT has_table_privilege('service_role','customer_review_test.customer_review_flags','SELECT') THEN RAISE EXCEPTION 'BACKEND_READ_GRANT_MISSING'; END IF;
 BEGIN PERFORM customer_review_test.staff_customer_review_matches(ARRAY(SELECT gen_random_uuid() FROM generate_series(1,101)));RAISE EXCEPTION 'LIMIT_NOT_ENFORCED';EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'TOO_MANY_ORDER_IDS' THEN RAISE;END IF;END;
 UPDATE customer_review_test.customer_review_flags SET active=false;
 IF EXISTS(SELECT 1 FROM customer_review_test.staff_customer_review_matches(ARRAY['00000000-0000-4000-8000-000000000001']::uuid[])) THEN RAISE EXCEPTION 'CLEARED_FLAG_STILL_MATCHES'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS_SYNTHETIC_MATCHING_PRIVACY_AND_CLEARING' AS result;
