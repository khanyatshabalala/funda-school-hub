-- ============================================================
-- Split full_name into first_name + last_name, add location
-- ============================================================

-- Add new columns (keep full_name for backward compat — computed from first+last)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text,
  ADD COLUMN IF NOT EXISTS city       text,
  ADD COLUMN IF NOT EXISTS province   text;

-- Backfill: split existing full_name into first/last where possible
UPDATE public.profiles
SET
  first_name = split_part(full_name, ' ', 1),
  last_name  = CASE
    WHEN position(' ' IN full_name) > 0
    THEN substring(full_name FROM position(' ' IN full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL
  AND first_name IS NULL;

-- Keep full_name in sync via trigger
CREATE OR REPLACE FUNCTION public.trg_sync_full_name()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := trim(coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, ''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_full_name ON public.profiles;
CREATE TRIGGER trg_sync_full_name
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_full_name();
