-- Staff-only, read-only batch classification. NOT APPLIED TO PRODUCTION.
-- Requires staff_review_phone_key(text) from customer-review-flags.sql.
BEGIN;
CREATE FUNCTION public.staff_new_customer_history(order_ids uuid[])
RETURNS TABLE(order_id uuid, classification text)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
 IF coalesce(cardinality(order_ids),0)>100 THEN
   RAISE EXCEPTION 'TOO_MANY_ORDER_IDS';
 END IF;
 RETURN QUERY
 WITH target AS (
   SELECT o.id,o.customer_id,o.created_at,
          public.staff_review_phone_key(c.phone) AS phone_key,
          nullif(lower(btrim(c.email)),'') AS email_key
   FROM public.orders o
   LEFT JOIN public.customers c ON c.id=o.customer_id
   WHERE o.id=ANY(order_ids)
 ), classified AS (
   SELECT t.id,
     CASE
       WHEN t.customer_id IS NULL AND t.phone_key IS NULL AND t.email_key IS NULL
         THEN 'possibly_new'
       WHEN EXISTS (
         SELECT 1 FROM public.orders p
         WHERE p.id<>t.id AND p.created_at<t.created_at
           AND p.status='completed' AND p.is_test IS DISTINCT FROM TRUE
           AND p.customer_id=t.customer_id AND t.customer_id IS NOT NULL
       ) THEN 'returning'
       WHEN EXISTS (
         SELECT 1 FROM public.orders p
         JOIN public.customers pc ON pc.id=p.customer_id
         WHERE p.id<>t.id AND p.created_at<t.created_at
           AND p.status='completed' AND p.is_test IS DISTINCT FROM TRUE
           AND (
             (t.phone_key IS NOT NULL AND public.staff_review_phone_key(pc.phone)=t.phone_key)
             OR (t.email_key IS NOT NULL AND nullif(lower(btrim(pc.email)),'')=t.email_key)
           )
       ) THEN 'possibly_new'
       ELSE 'new'
     END AS result
   FROM target t
 )
 SELECT c.id,c.result FROM classified c;
END;
$$;
REVOKE ALL ON FUNCTION public.staff_new_customer_history(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_new_customer_history(uuid[]) TO service_role;
COMMIT;
