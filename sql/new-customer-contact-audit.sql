-- Staff-only contact workflow storage. REVIEW ONLY: not applied.
-- Changes are written only by a protected backend using service_role.
BEGIN;
CREATE TABLE public.staff_customer_contact_status (
 order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE RESTRICT,
 status text NOT NULL CHECK (status IN ('contacted','unreachable','not_required')),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_by text NOT NULL CHECK (length(btrim(updated_by)) BETWEEN 3 AND 254)
);
ALTER TABLE public.staff_customer_contact_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_customer_contact_status FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.staff_customer_contact_status TO service_role;

CREATE TABLE public.staff_customer_contact_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
 status text NOT NULL CHECK (status IN ('contacted','unreachable','not_required')),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recorded_by text NOT NULL CHECK (length(btrim(recorded_by)) BETWEEN 3 AND 254)
);
CREATE INDEX staff_customer_contact_audit_order_idx
 ON public.staff_customer_contact_audit(order_id,recorded_at DESC);
ALTER TABLE public.staff_customer_contact_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_customer_contact_audit FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.staff_customer_contact_audit TO service_role;
-- Intentionally no UPDATE/DELETE on audit, including service_role.

CREATE FUNCTION public.staff_record_customer_contact(
 target_order_id uuid, new_status text, staff_actor text
) RETURNS TABLE(order_id uuid,status text,updated_at timestamptz,updated_by text)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path=pg_catalog,public
AS $$
BEGIN
 IF new_status NOT IN ('contacted','unreachable','not_required')
    OR staff_actor IS NULL OR length(btrim(staff_actor)) NOT BETWEEN 3 AND 254
    OR staff_actor !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
   RAISE EXCEPTION 'INVALID_CONTACT_UPDATE';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.id=target_order_id) THEN
   RAISE EXCEPTION 'ORDER_NOT_FOUND';
 END IF;
 INSERT INTO public.staff_customer_contact_status AS s(order_id,status,updated_by)
 VALUES(target_order_id,new_status,staff_actor)
 ON CONFLICT(order_id) DO UPDATE
 SET status=EXCLUDED.status,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp();
 INSERT INTO public.staff_customer_contact_audit(order_id,status,recorded_by)
 VALUES(target_order_id,new_status,staff_actor);
 RETURN QUERY SELECT s.order_id,s.status,s.updated_at,s.updated_by
 FROM public.staff_customer_contact_status s WHERE s.order_id=target_order_id;
END;
$$;
REVOKE ALL ON FUNCTION public.staff_record_customer_contact(uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_record_customer_contact(uuid,text,text)
 TO service_role;
COMMIT;
