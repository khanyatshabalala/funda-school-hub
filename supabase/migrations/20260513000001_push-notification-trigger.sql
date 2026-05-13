-- ============================================================
-- Trigger: fire send-push edge function on new notification
-- Uses pg_net (available in Supabase) to make an async HTTP call
-- ============================================================

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trg_send_push_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _url  text;
  _key  text;
BEGIN
  -- These are set as Supabase secrets / vault values
  _url := current_setting('app.supabase_url',  true);
  _key := current_setting('app.service_role_key', true);

  -- Fall back to env-style secrets if vault not configured
  IF _url IS NULL OR _url = '' THEN
    RETURN NEW;  -- skip silently if not configured
  END IF;

  PERFORM net.http_post(
    url     := _url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body    := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_push_notification ON public.notifications;
CREATE TRIGGER trg_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_send_push_notification();
