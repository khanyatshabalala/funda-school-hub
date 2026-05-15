-- ============================================================
-- Push notification tokens (web + mobile)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text NOT NULL,          -- Expo push token (mobile) or web push endpoint (web)
  platform   text NOT NULL DEFAULT 'web', -- 'ios' | 'android' | 'web'
  p256dh     text,                   -- web push only
  auth_key   text,                   -- web push only
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "Users manage own push tokens"
  ON public.push_tokens
  FOR ALL
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can read all tokens (for sending pushes server-side)
CREATE POLICY "Service role reads all push tokens"
  ON public.push_tokens
  FOR SELECT
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user
  ON public.push_tokens(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.trg_push_tokens_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER trg_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.trg_push_tokens_updated_at();
