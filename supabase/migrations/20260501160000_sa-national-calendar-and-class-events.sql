-- ============================================================
-- 1. National calendar table (SA term dates + public holidays)
--    Read-only for everyone. Managed by super_admin only.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.national_calendar (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  event_date  date        NOT NULL,
  end_date    date,                          -- for multi-day events like terms
  event_type  text        NOT NULL,          -- 'term_start','term_end','holiday','public_holiday'
  year        int         NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.national_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view national calendar" ON public.national_calendar FOR SELECT USING (true);
CREATE POLICY "Super admins manage national calendar" ON public.national_calendar
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE INDEX idx_national_calendar_date ON public.national_calendar(event_date);
CREATE INDEX idx_national_calendar_year ON public.national_calendar(year);

-- ============================================================
-- 2. Add class_id to calendar_events (nullable = whole school)
-- ============================================================
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_class ON public.calendar_events(class_id);

-- ============================================================
-- 3. Updated notification helper — supports class-scoped events
-- ============================================================

-- Notify parents of a specific class only
CREATE OR REPLACE FUNCTION public.notify_class_parents(
  _class_id  uuid,
  _title     text,
  _body      text,
  _category  text,
  _link      text DEFAULT '/app/calendar'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, category, link)
  SELECT DISTINCT pl.parent_user_id, _title, _body, _category, _link
  FROM   public.parent_links     pl
  JOIN   public.class_enrollments ce ON ce.learner_id = pl.learner_id
  WHERE  ce.class_id = _class_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_class_parents(uuid,text,text,text,text)
  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.notify_class_parents(uuid,text,text,text,text)
  TO authenticated, service_role;

-- ============================================================
-- 4. Updated trigger — routes to class or school parents
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_calendar_event_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _school_id uuid;
  _class_id  uuid;
  _title     text;
  _body      text;
  _class_name text;
BEGIN
  _school_id := COALESCE(NEW.school_id, OLD.school_id);
  _class_id  := COALESCE(NEW.class_id,  OLD.class_id);

  -- National calendar events have no school — skip
  IF _school_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Get class name for scoped notifications
  IF _class_id IS NOT NULL THEN
    SELECT name INTO _class_name FROM public.classes WHERE id = _class_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _title := '📅 New event: ' || NEW.title;
    _body  := to_char(NEW.event_date::date, 'DD Mon YYYY')
              || CASE WHEN NEW.event_time IS NOT NULL
                      THEN ' at ' || to_char(NEW.event_time::time, 'HH12:MI AM')
                      ELSE '' END
              || CASE WHEN _class_name IS NOT NULL
                      THEN ' · ' || _class_name
                      ELSE '' END
              || CASE WHEN NEW.description IS NOT NULL
                      THEN ' — ' || left(NEW.description, 100)
                      ELSE '' END;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.title       IS NOT DISTINCT FROM OLD.title
   AND NEW.event_date  IS NOT DISTINCT FROM OLD.event_date
   AND NEW.event_time  IS NOT DISTINCT FROM OLD.event_time
   AND NEW.description IS NOT DISTINCT FROM OLD.description THEN
      RETURN NEW; -- nothing meaningful changed
    END IF;
    _title := '✏️ Event updated: ' || NEW.title;
    _body  := to_char(NEW.event_date::date, 'DD Mon YYYY')
              || CASE WHEN NEW.event_time IS NOT NULL
                      THEN ' at ' || to_char(NEW.event_time::time, 'HH12:MI AM')
                      ELSE '' END
              || CASE WHEN _class_name IS NOT NULL
                      THEN ' · ' || _class_name
                      ELSE '' END;

  ELSIF TG_OP = 'DELETE' THEN
    _title := '🗑️ Event cancelled: ' || OLD.title;
    _body  := to_char(OLD.event_date::date, 'DD Mon YYYY') || ' has been removed.'
              || CASE WHEN _class_name IS NOT NULL THEN ' (' || _class_name || ')' ELSE '' END;
  END IF;

  -- Route: class-scoped or whole-school
  IF _class_id IS NOT NULL THEN
    PERFORM public.notify_class_parents(_class_id, _title, _body, 'calendar');
  ELSE
    PERFORM public.notify_school_parents(_school_id, _title, _body, 'calendar');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_calendar_notify ON public.calendar_events;
CREATE TRIGGER trg_calendar_notify
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_calendar_event_notify();

-- ============================================================
-- 5. Seed 2026 SA school calendar
--    Source: DBE official term dates for 2026
-- ============================================================
INSERT INTO public.national_calendar (title, event_date, end_date, event_type, year, description) VALUES

-- ── Term 1 ──
('Term 1 Opens',          '2026-01-14', NULL,         'term_start',    2026, 'First day of Term 1 for all SA public schools'),
('Term 1 Closes',         '2026-03-27', NULL,         'term_end',      2026, 'Last day of Term 1'),

-- ── Term 2 ──
('Term 2 Opens',          '2026-04-14', NULL,         'term_start',    2026, 'First day of Term 2'),
('Term 2 Closes',         '2026-06-19', NULL,         'term_end',      2026, 'Last day of Term 2'),

-- ── Term 3 ──
('Term 3 Opens',          '2026-07-14', NULL,         'term_start',    2026, 'First day of Term 3'),
('Term 3 Closes',         '2026-09-18', NULL,         'term_end',      2026, 'Last day of Term 3'),

-- ── Term 4 ──
('Term 4 Opens',          '2026-10-06', NULL,         'term_start',    2026, 'First day of Term 4'),
('Term 4 Closes',         '2026-12-03', NULL,         'term_end',      2026, 'Last day of Term 4 (most grades)'),

-- ── Public holidays 2026 ──
('New Year''s Day',       '2026-01-01', NULL,         'public_holiday', 2026, NULL),
('Human Rights Day',      '2026-03-21', NULL,         'public_holiday', 2026, NULL),
('Good Friday',           '2026-04-03', NULL,         'public_holiday', 2026, NULL),
('Family Day',            '2026-04-06', NULL,         'public_holiday', 2026, NULL),
('Freedom Day',           '2026-04-27', NULL,         'public_holiday', 2026, NULL),
('Workers'' Day',         '2026-05-01', NULL,         'public_holiday', 2026, NULL),
('Youth Day',             '2026-06-16', NULL,         'public_holiday', 2026, NULL),
('National Women''s Day', '2026-08-09', NULL,         'public_holiday', 2026, NULL),
('Heritage Day',          '2026-09-24', NULL,         'public_holiday', 2026, NULL),
('Day of Reconciliation', '2026-12-16', NULL,         'public_holiday', 2026, NULL),
('Christmas Day',         '2026-12-25', NULL,         'public_holiday', 2026, NULL),
('Day of Goodwill',       '2026-12-26', NULL,         'public_holiday', 2026, NULL)

ON CONFLICT DO NOTHING;
