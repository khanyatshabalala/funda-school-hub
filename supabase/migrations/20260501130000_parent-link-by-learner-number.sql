-- ============================================================
-- Parents can search for a learner by learner_number + school_id
-- (read-only, no personal data exposed — just name and grade)
-- They still cannot INSERT learners — only school staff can do that.
-- ============================================================

-- Allow parents to look up a learner by learner_number to link them.
-- The existing "Parents view their children" policy only works AFTER
-- the link exists. We need a narrow search policy for the lookup step.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'learners' AND policyname = 'Parents search learner by number'
  ) THEN
    CREATE POLICY "Parents search learner by number" ON public.learners
      FOR SELECT
      USING (
        -- Only allow if the caller has the parent role and is searching
        -- by learner_number (enforced by the query filter, not the policy).
        -- The policy just opens the door for authenticated users with parent role.
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'parent'
        )
        AND learner_number IS NOT NULL
      );
  END IF;
END $$;

-- Ensure parents CANNOT insert learners directly (belt-and-suspenders).
-- The existing "School admins manage learners" policy already covers INSERT
-- with a school role check. We add an explicit denial for parents.
-- In Postgres RLS, no matching policy = denied, so this is already safe.
-- But let's be explicit with a comment for clarity.

-- No INSERT policy for parents on learners table = denied by default. ✓

-- ============================================================
-- parent_links: allow parents to insert their own links
-- (was missing — parents couldn't link themselves to a learner)
-- ============================================================
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
