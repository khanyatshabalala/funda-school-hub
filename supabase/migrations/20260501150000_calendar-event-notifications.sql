-- ============================================================
-- Notify parents when a calendar event is created, updated
-- or deleted at their child's school.
-- ============================================================

-- Helper: insert a notification for every parent linked to a school
CREATE OR REPLACE FUNCTION public.notify_school_parents(
  _school_id   uuid,
  _title       text,
  _body        text,
  _category    text,
  _link        text DEFAULT '/app/calendar'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, category, link)
  SELECT DISTINCT pl.parent_user_id, _title, _body, _category, _link
  FROM   public.parent_links pl
  JOIN   public.learners     l  ON l.id = pl.learner_id
  WHERE  l.school_id = _school_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_school_parents(uuid,text,text,text,text)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.notify_school_parents(uuid,text,text,text,text)
  TO authenticated, service_role;

-- ── Trigger function ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_calendar_event_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _school_id uuid;
  _title     text;
  _body      text;
BEGIN
  -- Determine which school is affected
  _school_id := COALESCE(NEW.school_id, OLD.school_id);
  IF _school_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    _title := '📅 New event: ' || NEW.title;
    _body  := to_char(NEW.event_date::date, 'DD Mon YYYY')
              || CASE WHEN NEW.event_time IS NOT NULL
                      THEN ' at ' || to_char(NEW.event_time::time, 'HH12:MI AM')
                      ELSE '' END
              || CASE WHEN NEW.description IS NOT NULL
                      THEN ' — ' || left(NEW.description, 120)
                      ELSE '' END;
    PERFORM public.notify_school_parents(_school_id, _title, _body, 'calendar');

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only notify if something meaningful changed
    IF NEW.title       IS DISTINCT FROM OLD.title
    OR NEW.event_date  IS DISTINCT FROM OLD.event_date
    OR NEW.event_time  IS DISTINCT FROM OLD.event_time
    OR NEW.description IS DISTINCT FROM OLD.description THEN
      _title := '✏️ Event updated: ' || NEW.title;
      _body  := to_char(NEW.event_date::date, 'DD Mon YYYY')
                || CASE WHEN NEW.event_time IS NOT NULL
                        THEN ' at ' || to_char(NEW.event_time::time, 'HH12:MI AM')
                        ELSE '' END
                || CASE WHEN NEW.description IS NOT NULL
                        THEN ' — ' || left(NEW.description, 120)
                        ELSE '' END;
      PERFORM public.notify_school_parents(_school_id, _title, _body, 'calendar');
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    _title := '🗑️ Event cancelled: ' || OLD.title;
    _body  := to_char(OLD.event_date::date, 'DD Mon YYYY') || ' has been removed from the calendar.';
    PERFORM public.notify_school_parents(_school_id, _title, _body, 'calendar');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── Attach trigger ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_calendar_notify ON public.calendar_events;
CREATE TRIGGER trg_calendar_notify
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_calendar_event_notify();
