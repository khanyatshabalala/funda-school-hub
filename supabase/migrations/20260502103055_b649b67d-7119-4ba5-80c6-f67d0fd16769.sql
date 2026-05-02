-- Add 'ecd' to school_phase enum (must run in its own transaction)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ecd' AND enumtypid = 'public.school_phase'::regtype) THEN
    ALTER TYPE public.school_phase ADD VALUE 'ecd';
  END IF;
END $$;