-- ============================================================
-- 1. Add missing phase values to match the UI
--    (DB had: primary, secondary, combined — UI also uses ECD)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ecd' AND enumtypid = 'public.school_phase'::regtype) THEN
    ALTER TYPE public.school_phase ADD VALUE 'ecd';
  END IF;
END $$;

-- ============================================================
-- 2. Grant is_super_admin to service_role (safety)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO service_role;

-- ============================================================
-- 3. Allow super_admin to view all learners (needed for admin overview)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'learners' AND policyname = 'Super admins view all learners'
  ) THEN
    CREATE POLICY "Super admins view all learners" ON public.learners
      FOR SELECT USING (public.is_super_admin(auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 4. Allow super_admin to view all profiles (already exists but
--    ensure it covers the admin/users page query)
-- ============================================================
-- Policy "Super admins view all profiles" was added in migration 20260430184930
-- Nothing extra needed here.

-- ============================================================
-- 5. Clean up dangling "parent" roles for any existing staff
--    accounts (users who have a staff role AND a parent role)
-- ============================================================
DELETE FROM public.user_roles
WHERE role = 'parent'
  AND user_id IN (
    SELECT DISTINCT user_id FROM public.user_roles
    WHERE role IN ('teacher', 'principal', 'school_admin', 'super_admin')
  );
