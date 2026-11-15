BEGIN;
CREATE TABLE public.customer_review_flags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
 source_order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
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
ALTER TABLE public.customer_review_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_review_flags FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.customer_review_flags TO service_role;
CREATE INDEX customer_review_phone_idx ON public.customer_review_flags(phone_key) WHERE active;
CREATE INDEX customer_review_email_idx ON public.customer_review_flags(email_key) WHERE active;
CREATE INDEX customer_review_name_idx ON public.customer_review_flags(name_key) WHERE active;
CREATE INDEX customer_review_customer_idx ON public.customer_review_flags(customer_id) WHERE active;

CREATE FUNCTION public.staff_review_phone_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE SECURITY INVOKER SET search_path=pg_catalog AS $$
 WITH digits AS (SELECT regexp_replace(value,'[^0-9]','','g') AS n),
 international AS (SELECT CASE WHEN n LIKE '0044%' THEN substring(n FROM 3) ELSE n END AS n FROM digits),
 canonical AS (SELECT CASE WHEN n ~ '^0[1-9][0-9]{9}$' THEN '44'||substring(n FROM 2)
  WHEN n ~ '^440[0-9]{10}$' THEN '44'||substring(n FROM 4) ELSE n END AS n FROM international)
 SELECT CASE WHEN length(n) BETWEEN 8 AND 15 THEN n ELSE NULL END FROM canonical;
$$;
REVOKE ALL ON FUNCTION public.staff_review_phone_key(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_review_phone_key(text) TO service_role;

CREATE FUNCTION public.staff_customer_review_matches(order_ids uuid[]) RETURNS TABLE(order_id uuid,matches jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF coalesce(cardinality(order_ids),0)>100 THEN RAISE EXCEPTION 'TOO_MANY_ORDER_IDS'; END IF;
 RETURN QUERY
 WITH candidates AS (
  SELECT o.id,o.customer_id,coalesce(o.confirmed_time,o.preferred_time,o.created_at) AS booked_at,
   public.staff_review_phone_key(c.phone) AS phone_key,nullif(lower(btrim(c.email)),'') AS email_key,
   nullif(lower(regexp_replace(btrim(c.full_name),'[[:space:]]+',' ','g')),'') AS name_key
  FROM public.orders o LEFT JOIN public.customers c ON c.id=o.customer_id WHERE o.id=ANY(order_ids)
 ), matching AS (
  SELECT o.id AS oid,f.id AS flag_id,f.reason,f.occurred_at,s.order_ref,f.food_prepared,f.unpaid,f.phone_unobtainable,f.email_bounced,
   array_remove(ARRAY[
    CASE WHEN o.id=f.source_order_id THEN 'source_order' END,
    CASE WHEN o.customer_id=f.customer_id THEN 'customer_record' END,
    CASE WHEN o.phone_key=f.phone_key THEN 'phone' END,
    CASE WHEN o.email_key=f.email_key THEN 'email' END],NULL) AS exact,
   o.name_key=f.name_key AND length(o.name_key)>=6 AND o.name_key LIKE '% %' AS name_match
  FROM candidates o JOIN public.customer_review_flags f ON f.active AND
   (o.id=f.source_order_id OR o.booked_at>=f.occurred_at) AND
   (o.id=f.source_order_id OR o.customer_id=f.customer_id OR o.phone_key=f.phone_key OR o.email_key=f.email_key OR
    (o.name_key=f.name_key AND length(o.name_key)>=6 AND o.name_key LIKE '% %'))
   JOIN public.orders s ON s.id=f.source_order_id
 )
 SELECT m.oid,jsonb_agg(jsonb_build_object('flagId',m.flag_id,'sourceOrderRef',m.order_ref,'occurredAt',m.occurred_at,
  'reason',m.reason,'matchTypes',CASE WHEN cardinality(m.exact)>0 THEN m.exact ELSE ARRAY['name'] END,
  'possibleMatch',cardinality(m.exact)=0,'foodPrepared',m.food_prepared,'unpaid',m.unpaid,
  'phoneUnobtainable',m.phone_unobtainable,'emailBounced',m.email_bounced) ORDER BY m.occurred_at DESC,m.flag_id)
 FROM matching m GROUP BY m.oid;
END;
$$;
REVOKE ALL ON FUNCTION public.staff_customer_review_matches(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_customer_review_matches(uuid[]) TO service_role;
COMMIT;
