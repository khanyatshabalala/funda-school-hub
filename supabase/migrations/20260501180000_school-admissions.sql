-- ============================================================
-- School admissions info + performance + transition notifications
-- ============================================================

-- 1. Add admissions fields to schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS grade_from          int,          -- lowest grade offered (0 = Grade R)
  ADD COLUMN IF NOT EXISTS grade_to            int,          -- highest grade offered (12)
  ADD COLUMN IF NOT EXISTS application_open    date,         -- when applications open
  ADD COLUMN IF NOT EXISTS application_close   date,         -- when applications close
  ADD COLUMN IF NOT EXISTS admission_requirements text,      -- free text: what docs/criteria needed
  ADD COLUMN IF NOT EXISTS application_contact text,         -- who to contact / where to apply
  ADD COLUMN IF NOT EXISTS performance_avg     numeric(5,2), -- cached average mark % (updated by trigger)
  ADD COLUMN IF NOT EXISTS performance_rank_district  int,   -- rank within district (1 = best)
  ADD COLUMN IF NOT EXISTS performance_rank_province  int,   -- rank within province
  ADD COLUMN IF NOT EXISTS performance_rank_national  int;   -- national rank

-- 2. Index for discovery queries
CREATE INDEX IF NOT EXISTS idx_schools_grade_range ON public.schools(grade_from, grade_to);
CREATE INDEX IF NOT EXISTS idx_schools_app_open    ON public.schools(application_open);
CREATE INDEX IF NOT EXISTS idx_schools_perf        ON public.schools(performance_avg DESC NULLS LAST);

-- 3. Super admin can update admissions info
-- (policy already exists: "Super admins update all schools")

-- 4. Function: recalculate performance averages for a school
--    Called manually or via marks trigger
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

  -- Recalculate district ranks
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

  -- Recalculate province ranks
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

  -- Recalculate national ranks
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

-- 5. Trigger: when application_open date is set/updated on a school,
--    notify parents whose child is in the last grade of the previous phase
CREATE OR REPLACE FUNCTION public.trg_school_application_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _first_grade int;
  _prev_last   int;  -- last grade of the phase BEFORE this school's entry grade
  _title       text;
  _body        text;
BEGIN
  -- Only fire when application_open is newly set or changed
  IF NEW.application_open IS NULL THEN RETURN NEW; END IF;
  IF NEW.application_open = OLD.application_open THEN RETURN NEW; END IF;
  -- Only notify if applications haven't closed yet
  IF NEW.application_close IS NOT NULL AND NEW.application_close < CURRENT_DATE THEN RETURN NEW; END IF;

  _first_grade := NEW.grade_from;
  IF _first_grade IS NULL THEN RETURN NEW; END IF;

  -- The "graduating" grade is one below the school's entry grade
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

  -- Notify parents whose child is currently in _prev_last grade
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
