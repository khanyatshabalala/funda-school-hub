-- ============================================================
-- Migration 120000: staff/role cleanup
-- ============================================================
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'learners' AND policyname = 'Super admins view all learners'
  ) THEN
    CREATE POLICY "Super admins view all learners" ON public.learners
      FOR SELECT USING (public.is_super_admin(auth.uid()));
  END IF;
END $$;

DELETE FROM public.user_roles
WHERE role = 'parent'
  AND user_id IN (
    SELECT DISTINCT user_id FROM public.user_roles
    WHERE role IN ('teacher', 'principal', 'school_admin', 'super_admin')
  );

-- ============================================================
-- Migration 130000: parent search learner by number
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'learners' AND policyname = 'Parents search learner by number'
  ) THEN
    CREATE POLICY "Parents search learner by number" ON public.learners
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'parent'
        )
        AND learner_number IS NOT NULL
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'parent_links' AND policyname = 'Parents insert own links'
  ) THEN
    CREATE POLICY "Parents insert own links" ON public.parent_links
      FOR INSERT
      WITH CHECK (auth.uid() = parent_user_id);
  END IF;
END $$;

-- ============================================================
-- Migration 150000: calendar event notifications (school-wide)
-- ============================================================
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
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.notify_school_parents(uuid,text,text,text,text)
  TO service_role;

-- ============================================================
-- Migration 160000: national_calendar + class-scoped events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.national_calendar (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  event_date  date        NOT NULL,
  end_date    date,
  event_type  text        NOT NULL,
  year        int         NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.national_calendar ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='national_calendar' AND policyname='Anyone can view national calendar') THEN
    CREATE POLICY "Anyone can view national calendar" ON public.national_calendar FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='national_calendar' AND policyname='Super admins manage national calendar') THEN
    CREATE POLICY "Super admins manage national calendar" ON public.national_calendar
      FOR ALL USING (public.is_super_admin(auth.uid()))
      WITH CHECK (public.is_super_admin(auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_national_calendar_date ON public.national_calendar(event_date);
CREATE INDEX IF NOT EXISTS idx_national_calendar_year ON public.national_calendar(year);

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_class ON public.calendar_events(class_id);

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
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.notify_class_parents(uuid,text,text,text,text)
  TO service_role;

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

  IF _school_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF _class_id IS NOT NULL THEN
    SELECT name INTO _class_name FROM public.classes WHERE id = _class_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _title := '📅 New event: ' || NEW.title;
    _body  := to_char(NEW.event_date::date, 'DD Mon YYYY')
              || CASE WHEN NEW.event_time IS NOT NULL
                      THEN ' at ' || to_char(NEW.event_time::time, 'HH12:MI AM')
                      ELSE '' END
              || CASE WHEN _class_name IS NOT NULL THEN ' · ' || _class_name ELSE '' END
              || CASE WHEN NEW.description IS NOT NULL THEN ' — ' || left(NEW.description, 100) ELSE '' END;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.title       IS NOT DISTINCT FROM OLD.title
   AND NEW.event_date  IS NOT DISTINCT FROM OLD.event_date
   AND NEW.event_time  IS NOT DISTINCT FROM OLD.event_time
   AND NEW.description IS NOT DISTINCT FROM OLD.description THEN
      RETURN NEW;
    END IF;
    _title := '✏️ Event updated: ' || NEW.title;
    _body  := to_char(NEW.event_date::date, 'DD Mon YYYY')
              || CASE WHEN NEW.event_time IS NOT NULL
                      THEN ' at ' || to_char(NEW.event_time::time, 'HH12:MI AM')
                      ELSE '' END
              || CASE WHEN _class_name IS NOT NULL THEN ' · ' || _class_name ELSE '' END;

  ELSIF TG_OP = 'DELETE' THEN
    _title := '🗑️ Event cancelled: ' || OLD.title;
    _body  := to_char(OLD.event_date::date, 'DD Mon YYYY') || ' has been removed.'
              || CASE WHEN _class_name IS NOT NULL THEN ' (' || _class_name || ')' ELSE '' END;
  END IF;

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

INSERT INTO public.national_calendar (title, event_date, end_date, event_type, year, description) VALUES
('Term 1 Opens',          '2026-01-14', NULL, 'term_start',     2026, 'First day of Term 1 for all SA public schools'),
('Term 1 Closes',         '2026-03-27', NULL, 'term_end',       2026, 'Last day of Term 1'),
('Term 2 Opens',          '2026-04-14', NULL, 'term_start',     2026, 'First day of Term 2'),
('Term 2 Closes',         '2026-06-19', NULL, 'term_end',       2026, 'Last day of Term 2'),
('Term 3 Opens',          '2026-07-14', NULL, 'term_start',     2026, 'First day of Term 3'),
('Term 3 Closes',         '2026-09-18', NULL, 'term_end',       2026, 'Last day of Term 3'),
('Term 4 Opens',          '2026-10-06', NULL, 'term_start',     2026, 'First day of Term 4'),
('Term 4 Closes',         '2026-12-03', NULL, 'term_end',       2026, 'Last day of Term 4 (most grades)'),
('New Year''s Day',       '2026-01-01', NULL, 'public_holiday', 2026, NULL),
('Human Rights Day',      '2026-03-21', NULL, 'public_holiday', 2026, NULL),
('Good Friday',           '2026-04-03', NULL, 'public_holiday', 2026, NULL),
('Family Day',            '2026-04-06', NULL, 'public_holiday', 2026, NULL),
('Freedom Day',           '2026-04-27', NULL, 'public_holiday', 2026, NULL),
('Workers'' Day',         '2026-05-01', NULL, 'public_holiday', 2026, NULL),
('Youth Day',             '2026-06-16', NULL, 'public_holiday', 2026, NULL),
('National Women''s Day', '2026-08-09', NULL, 'public_holiday', 2026, NULL),
('Heritage Day',          '2026-09-24', NULL, 'public_holiday', 2026, NULL),
('Day of Reconciliation', '2026-12-16', NULL, 'public_holiday', 2026, NULL),
('Christmas Day',         '2026-12-25', NULL, 'public_holiday', 2026, NULL),
('Day of Goodwill',       '2026-12-26', NULL, 'public_holiday', 2026, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Migration 170000: parent_link_requests
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='link_request_status') THEN
    CREATE TYPE public.link_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.parent_link_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id        uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_number   text        NOT NULL,
  first_name       text        NOT NULL,
  last_name        text        NOT NULL,
  relationship     text        NOT NULL DEFAULT 'parent',
  status           public.link_request_status NOT NULL DEFAULT 'pending',
  reviewed_by      uuid        REFERENCES auth.users(id),
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, school_id, learner_number)
);

CREATE INDEX IF NOT EXISTS idx_link_requests_school ON public.parent_link_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_link_requests_parent ON public.parent_link_requests(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_link_requests_status ON public.parent_link_requests(status);

ALTER TABLE public.parent_link_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_link_requests' AND policyname='Parents view own requests') THEN
    CREATE POLICY "Parents view own requests" ON public.parent_link_requests
      FOR SELECT USING (auth.uid() = parent_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_link_requests' AND policyname='Parents insert own requests') THEN
    CREATE POLICY "Parents insert own requests" ON public.parent_link_requests
      FOR INSERT WITH CHECK (auth.uid() = parent_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_link_requests' AND policyname='School staff view requests') THEN
    CREATE POLICY "School staff view requests" ON public.parent_link_requests
      FOR SELECT USING (
        public.has_school_role(auth.uid(), school_id, ARRAY['principal','school_admin']::app_role[])
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_link_requests' AND policyname='School staff update requests') THEN
    CREATE POLICY "School staff update requests" ON public.parent_link_requests
      FOR UPDATE USING (
        public.has_school_role(auth.uid(), school_id, ARRAY['principal','school_admin']::app_role[])
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parent_link_requests' AND policyname='Super admin view all requests') THEN
    CREATE POLICY "Super admin view all requests" ON public.parent_link_requests
      FOR ALL USING (public.is_super_admin(auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.approve_link_request(
  _request_id  uuid,
  _reviewer_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _req     public.parent_link_requests%ROWTYPE;
  _learner public.learners%ROWTYPE;
  _is_primary boolean;
BEGIN
  SELECT * INTO _req FROM public.parent_link_requests
  WHERE id = _request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found or already processed');
  END IF;

  SELECT * INTO _learner FROM public.learners
  WHERE school_id = _req.school_id
    AND LOWER(TRIM(learner_number)) = LOWER(TRIM(_req.learner_number));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No learner found with that learner number at this school');
  END IF;

  IF LOWER(TRIM(_learner.first_name)) != LOWER(TRIM(_req.first_name))
  OR LOWER(TRIM(_learner.last_name))  != LOWER(TRIM(_req.last_name)) THEN
    RETURN jsonb_build_object('error',
      'Name does not match school records. Expected: ' ||
      _learner.first_name || ' ' || _learner.last_name);
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.parent_links WHERE parent_user_id = _req.parent_user_id
  ) INTO _is_primary;

  INSERT INTO public.parent_links (parent_user_id, learner_id, relationship, is_primary)
  VALUES (_req.parent_user_id, _learner.id, _req.relationship, _is_primary)
  ON CONFLICT (parent_user_id, learner_id) DO NOTHING;

  UPDATE public.parent_link_requests
  SET status = 'approved', reviewed_by = _reviewer_id, reviewed_at = now()
  WHERE id = _request_id;

  INSERT INTO public.notifications (user_id, title, body, category, link)
  VALUES (
    _req.parent_user_id,
    '✅ Child linked: ' || _learner.first_name || ' ' || _learner.last_name,
    'Your request to link ' || _learner.first_name || ' ' || _learner.last_name ||
    ' at ' || (SELECT name FROM public.schools WHERE id = _req.school_id) ||
    ' has been approved.',
    'children',
    '/app/children'
  );

  RETURN jsonb_build_object('success', true, 'learner_id', _learner.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_link_request(
  _request_id      uuid,
  _reviewer_id     uuid,
  _reason          text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _req public.parent_link_requests%ROWTYPE;
BEGIN
  SELECT * INTO _req FROM public.parent_link_requests
  WHERE id = _request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found or already processed');
  END IF;

  UPDATE public.parent_link_requests
  SET status = 'rejected',
      reviewed_by = _reviewer_id,
      reviewed_at = now(),
      rejection_reason = _reason
  WHERE id = _request_id;

  INSERT INTO public.notifications (user_id, title, body, category, link)
  VALUES (
    _req.parent_user_id,
    '❌ Link request not approved',
    'Your request to link learner ' || _req.learner_number ||
    ' at ' || (SELECT name FROM public.schools WHERE id = _req.school_id) ||
    ' was not approved.' ||
    CASE WHEN _reason IS NOT NULL THEN ' Reason: ' || _reason ELSE '' END,
    'children',
    '/app/children'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_link_request(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_link_request(uuid, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.approve_link_request(uuid, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.reject_link_request(uuid, uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Parents insert own links" ON public.parent_links;

-- ============================================================
-- Migration 180000: school admissions + performance ranking
-- ============================================================
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS grade_from              int,
  ADD COLUMN IF NOT EXISTS grade_to                int,
  ADD COLUMN IF NOT EXISTS application_open        date,
  ADD COLUMN IF NOT EXISTS application_close       date,
  ADD COLUMN IF NOT EXISTS admission_requirements  text,
  ADD COLUMN IF NOT EXISTS application_contact     text,
  ADD COLUMN IF NOT EXISTS performance_avg         numeric(5,2),
  ADD COLUMN IF NOT EXISTS performance_rank_district  int,
  ADD COLUMN IF NOT EXISTS performance_rank_province  int,
  ADD COLUMN IF NOT EXISTS performance_rank_national  int;

CREATE INDEX IF NOT EXISTS idx_schools_grade_range ON public.schools(grade_from, grade_to);
CREATE INDEX IF NOT EXISTS idx_schools_app_open    ON public.schools(application_open);
CREATE INDEX IF NOT EXISTS idx_schools_perf        ON public.schools(performance_avg DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.recalculate_school_performance(_school_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _avg numeric(5,2);
BEGIN
  SELECT ROUND(AVG(score::numeric / NULLIF(max_score,0) * 100), 2)
  INTO   _avg
  FROM   public.marks m
  JOIN   public.learners l ON l.id = m.learner_id
  WHERE  l.school_id = _school_id;

  UPDATE public.schools SET performance_avg = _avg WHERE id = _school_id;

  WITH ranked AS (
    SELECT id,
           RANK() OVER (
             PARTITION BY district_id
             ORDER BY performance_avg DESC NULLS LAST
           ) AS rnk
    FROM public.schools
    WHERE district_id = (SELECT district_id FROM public.schools WHERE id = _school_id)
  )
  UPDATE public.schools s
  SET    performance_rank_district = r.rnk
  FROM   ranked r
  WHERE  s.id = r.id;

  WITH ranked AS (
    SELECT id,
           RANK() OVER (
             PARTITION BY province
             ORDER BY performance_avg DESC NULLS LAST
           ) AS rnk
    FROM public.schools
    WHERE province = (SELECT province FROM public.schools WHERE id = _school_id)
  )
  UPDATE public.schools s
  SET    performance_rank_province = r.rnk
  FROM   ranked r
  WHERE  s.id = r.id;

  WITH ranked AS (
    SELECT id,
           RANK() OVER (ORDER BY performance_avg DESC NULLS LAST) AS rnk
    FROM public.schools
  )
  UPDATE public.schools s
  SET    performance_rank_national = r.rnk
  FROM   ranked r
  WHERE  s.id = r.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_school_performance(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.recalculate_school_performance(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_school_application_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _first_grade int;
  _prev_last   int;
  _title       text;
  _body        text;
BEGIN
  IF NEW.application_open IS NULL THEN RETURN NEW; END IF;
  IF NEW.application_open = OLD.application_open THEN RETURN NEW; END IF;
  IF NEW.application_close IS NOT NULL AND NEW.application_close < CURRENT_DATE THEN RETURN NEW; END IF;

  _first_grade := NEW.grade_from;
  IF _first_grade IS NULL THEN RETURN NEW; END IF;

  _prev_last := _first_grade - 1;
  IF _prev_last < 0 THEN RETURN NEW; END IF;

  _title := '🎓 Applications open: ' || NEW.name;
  _body  := NEW.name || ' (Grade ' || _first_grade || '–' || COALESCE(NEW.grade_to::text, '?') || ') '
            || 'is now accepting applications'
            || CASE WHEN NEW.application_close IS NOT NULL
                    THEN ' until ' || to_char(NEW.application_close, 'DD Mon YYYY')
                    ELSE '' END
            || '. '
            || COALESCE('Apply: ' || NEW.application_contact, 'Contact the school directly to apply.')
            || ' — ' || NEW.district || ', ' || NEW.province;

  INSERT INTO public.notifications (user_id, title, body, category, link)
  SELECT DISTINCT pl.parent_user_id, _title, _body, 'admissions', '/schools/' || NEW.id
  FROM   public.parent_links pl
  JOIN   public.learners     l  ON l.id = pl.learner_id
  WHERE  l.grade_id = _prev_last;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_school_app_notify ON public.schools;
CREATE TRIGGER trg_school_app_notify
  AFTER UPDATE OF application_open ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.trg_school_application_notify();

-- ============================================================
-- Migration 190000: report cards (with arg-order fixes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_cards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id    uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  school_id     uuid NOT NULL REFERENCES public.schools(id)  ON DELETE CASCADE,
  academic_year int  NOT NULL DEFAULT EXTRACT(year FROM now())::int,
  term          int  NOT NULL CHECK (term BETWEEN 1 AND 4),
  file_path     text NOT NULL,
  file_name     text NOT NULL,
  uploaded_by   uuid REFERENCES auth.users(id),
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  notes         text,
  UNIQUE (learner_id, academic_year, term)
);

CREATE INDEX IF NOT EXISTS idx_report_cards_learner   ON public.report_cards(learner_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_school    ON public.report_cards(school_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_year_term ON public.report_cards(academic_year, term);

ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_cards' AND policyname='School staff manage report cards') THEN
    CREATE POLICY "School staff manage report cards"
      ON public.report_cards
      FOR ALL
      TO authenticated
      USING (
        public.has_school_role(auth.uid(), school_id, ARRAY['principal','school_admin','teacher']::public.app_role[])
        OR public.is_super_admin(auth.uid())
      )
      WITH CHECK (
        public.has_school_role(auth.uid(), school_id, ARRAY['principal','school_admin','teacher']::public.app_role[])
        OR public.is_super_admin(auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_cards' AND policyname='Parents read own children report cards') THEN
    CREATE POLICY "Parents read own children report cards"
      ON public.report_cards
      FOR SELECT
      TO authenticated
      USING (public.is_parent_of(auth.uid(), learner_id));
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('report-cards', 'report-cards', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='School staff upload report cards') THEN
    CREATE POLICY "School staff upload report cards"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'report-cards'
        AND public.has_school_role(
          auth.uid(),
          (storage.foldername(name))[1]::uuid,
          ARRAY['principal','school_admin','teacher']::public.app_role[]
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='School staff update report cards') THEN
    CREATE POLICY "School staff update report cards"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'report-cards'
        AND public.has_school_role(
          auth.uid(),
          (storage.foldername(name))[1]::uuid,
          ARRAY['principal','school_admin','teacher']::public.app_role[]
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='School staff delete report cards') THEN
    CREATE POLICY "School staff delete report cards"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'report-cards'
        AND public.has_school_role(
          auth.uid(),
          (storage.foldername(name))[1]::uuid,
          ARRAY['principal','school_admin','teacher']::public.app_role[]
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Parents read own children report card files') THEN
    CREATE POLICY "Parents read own children report card files"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'report-cards'
        AND EXISTS (
          SELECT 1 FROM public.report_cards rc
          JOIN public.parent_links pl ON pl.learner_id = rc.learner_id
          WHERE rc.file_path = name
            AND pl.parent_user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_report_card_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _learner_name text;
  _school_name  text;
BEGIN
  SELECT l.first_name || ' ' || l.last_name, s.name
  INTO   _learner_name, _school_name
  FROM   public.learners l
  JOIN   public.schools  s ON s.id = l.school_id
  WHERE  l.id = NEW.learner_id;

  INSERT INTO public.notifications (user_id, title, body, category, link)
  SELECT pl.parent_user_id,
         '📄 Report card available: ' || _learner_name,
         _school_name || ' has uploaded ' || _learner_name || '''s Term ' || NEW.term
           || ' ' || NEW.academic_year || ' report card.',
         'marks',
         '/app/marks'
  FROM   public.parent_links pl
  WHERE  pl.learner_id = NEW.learner_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_card_notify ON public.report_cards;
CREATE TRIGGER trg_report_card_notify
  AFTER INSERT ON public.report_cards
  FOR EACH ROW EXECUTE FUNCTION public.trg_report_card_notify();