-- Grant super_admin to mgebisak@gmail.com if the user exists
DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'mgebisak@gmail.com';
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Performance: indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_school_id ON public.user_roles(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_parent_user_id ON public.parent_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_learner_id ON public.parent_links(learner_id);
CREATE INDEX IF NOT EXISTS idx_learners_school_id ON public.learners(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_learner_date ON public.attendance(learner_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_marks_learner ON public.marks(learner_id);
CREATE INDEX IF NOT EXISTS idx_discipline_learner ON public.discipline_records(learner_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_schools_district ON public.schools(district_id);