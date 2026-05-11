-- ============================================================
-- Report cards: PDF upload per learner per term
-- ============================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.report_cards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id    uuid NOT NULL REFERENCES public.learners(id) ON DELETE CASCADE,
  school_id     uuid NOT NULL REFERENCES public.schools(id)  ON DELETE CASCADE,
  academic_year int  NOT NULL DEFAULT EXTRACT(year FROM now())::int,
  term          int  NOT NULL CHECK (term BETWEEN 1 AND 4),
  file_path     text NOT NULL,          -- storage path: report-cards/{school_id}/{learner_id}/{year}_T{term}.pdf
  file_name     text NOT NULL,          -- original filename shown to parent
  uploaded_by   uuid REFERENCES auth.users(id),
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  notes         text,                   -- optional note from teacher/admin
  UNIQUE (learner_id, academic_year, term)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_report_cards_learner  ON public.report_cards(learner_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_school   ON public.report_cards(school_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_year_term ON public.report_cards(academic_year, term);

-- 3. RLS
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

-- School staff can insert/update/delete for their school
CREATE POLICY "School staff manage report cards"
  ON public.report_cards
  FOR ALL
  TO authenticated
  USING (
    public.has_school_role(
      auth.uid(),
      school_id,
      ARRAY['principal','school_admin','teacher']::public.app_role[]
    )
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    public.has_school_role(
      auth.uid(),
      school_id,
      ARRAY['principal','school_admin','teacher']::public.app_role[]
    )
    OR public.is_super_admin(auth.uid())
  );

-- Parents can only read report cards for their linked children
CREATE POLICY "Parents read own children report cards"
  ON public.report_cards
  FOR SELECT
  TO authenticated
  USING (public.is_parent_of(learner_id, auth.uid()));

-- 4. Storage bucket (run separately if bucket doesn't exist)
-- The bucket is private — files are accessed via signed URLs only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-cards',
  'report-cards',
  false,
  10485760,   -- 10 MB max per file
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: school staff can upload to their school's folder
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

-- Storage RLS: school staff can delete from their school's folder
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

-- Storage RLS: parents can read their child's report cards (via signed URL)
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

-- 5. Notify parent when a new report card is uploaded
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
