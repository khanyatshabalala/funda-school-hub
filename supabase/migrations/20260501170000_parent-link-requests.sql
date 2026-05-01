-- ============================================================
-- Parent link requests — secure child linking flow
-- Parent submits a request, school admin/principal approves/rejects
-- ============================================================

CREATE TYPE public.link_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.parent_link_requests (
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
  -- One pending request per parent per learner number per school
  UNIQUE (parent_user_id, school_id, learner_number)
);

CREATE INDEX idx_link_requests_school    ON public.parent_link_requests(school_id);
CREATE INDEX idx_link_requests_parent    ON public.parent_link_requests(parent_user_id);
CREATE INDEX idx_link_requests_status    ON public.parent_link_requests(status);

ALTER TABLE public.parent_link_requests ENABLE ROW LEVEL SECURITY;

-- Parents can view and insert their own requests
CREATE POLICY "Parents view own requests" ON public.parent_link_requests
  FOR SELECT USING (auth.uid() = parent_user_id);

CREATE POLICY "Parents insert own requests" ON public.parent_link_requests
  FOR INSERT WITH CHECK (auth.uid() = parent_user_id);

-- School staff can view requests for their school
CREATE POLICY "School staff view requests" ON public.parent_link_requests
  FOR SELECT USING (
    public.has_school_role(auth.uid(), school_id,
      ARRAY['principal','school_admin']::app_role[])
  );

-- School staff can update (approve/reject) requests for their school
CREATE POLICY "School staff update requests" ON public.parent_link_requests
  FOR UPDATE USING (
    public.has_school_role(auth.uid(), school_id,
      ARRAY['principal','school_admin']::app_role[])
  );

-- Super admin can see all
CREATE POLICY "Super admin view all requests" ON public.parent_link_requests
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- ============================================================
-- Function: approve a link request
-- Finds the matching learner, creates parent_link, notifies parent
-- ============================================================
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
  -- Load request
  SELECT * INTO _req FROM public.parent_link_requests
  WHERE id = _request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found or already processed');
  END IF;

  -- Find matching learner by number + school
  SELECT * INTO _learner FROM public.learners
  WHERE school_id = _req.school_id
    AND LOWER(TRIM(learner_number)) = LOWER(TRIM(_req.learner_number));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No learner found with that learner number at this school');
  END IF;

  -- Verify name matches (case-insensitive, partial is fine)
  IF LOWER(TRIM(_learner.first_name)) != LOWER(TRIM(_req.first_name))
  OR LOWER(TRIM(_learner.last_name))  != LOWER(TRIM(_req.last_name)) THEN
    RETURN jsonb_build_object('error',
      'Name does not match school records. Expected: ' ||
      _learner.first_name || ' ' || _learner.last_name);
  END IF;

  -- Determine if this is the parent's first child
  SELECT NOT EXISTS (
    SELECT 1 FROM public.parent_links WHERE parent_user_id = _req.parent_user_id
  ) INTO _is_primary;

  -- Create the parent link
  INSERT INTO public.parent_links (parent_user_id, learner_id, relationship, is_primary)
  VALUES (_req.parent_user_id, _learner.id, _req.relationship, _is_primary)
  ON CONFLICT (parent_user_id, learner_id) DO NOTHING;

  -- Mark request approved
  UPDATE public.parent_link_requests
  SET status = 'approved', reviewed_by = _reviewer_id, reviewed_at = now()
  WHERE id = _request_id;

  -- Notify parent
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

-- Function: reject a link request
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

  -- Notify parent
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

-- ============================================================
-- Remove the old "Parents insert own links" policy —
-- parents no longer insert directly, they submit requests
-- ============================================================
DROP POLICY IF EXISTS "Parents insert own links" ON public.parent_links;
