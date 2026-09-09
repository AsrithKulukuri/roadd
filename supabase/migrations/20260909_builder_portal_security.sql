-- Apply after builder_enterprise_schema.sql. No listing is marked verified by this migration.
BEGIN;
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('builder_profiles','builder_requests','builder_messages','builder_activity_logs','project_site_visits','project_leads','project_activity_logs')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END $$;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['project_site_visits','project_leads','project_activity_logs'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', table_name);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;
-- All portal access now goes through authenticated, ownership-checked server routes.
REVOKE ALL ON public.builder_profiles, public.builder_requests, public.builder_messages, public.builder_activity_logs FROM anon, authenticated;
ALTER TABLE public.builder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_activity_logs ENABLE ROW LEVEL SECURITY;
UPDATE public.builder_profiles SET login_credentials_hint = NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('builder-evidence', 'builder-evidence', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['application/pdf'];

CREATE OR REPLACE FUNCTION public.review_builder_request(request_id uuid, new_status text, reviewer_id text, review_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.builder_requests%ROWTYPE; proof jsonb; project_location jsonb;
BEGIN
  IF new_status NOT IN ('pending','under_review','approved','rejected','active','completed') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO STRICT r FROM public.builder_requests WHERE id = request_id FOR UPDATE;
  proof := r.details->'verification';
  IF new_status = 'approved' AND r.status <> 'approved' THEN
    IF proof IS NOT NULL THEN
      SELECT location INTO STRICT project_location FROM public.projects WHERE id::text = r.project_id AND "projectType" = 'venture' FOR UPDATE;
      IF coalesce(proof->>'crdaLpNumber','') = '' OR coalesce(proof->>'surveyNumber','') = '' OR coalesce(proof->>'documentPath','') = '' THEN RAISE EXCEPTION 'Missing evidence'; END IF;
      UPDATE public.projects SET
        "crdaApproved" = true,
        location = coalesce(project_location, '{}'::jsonb) || jsonb_build_object(
          'crdaEvidence', jsonb_build_object(
            'crdaLpNumber', proof->>'crdaLpNumber', 'surveyNumber', proof->>'surveyNumber',
            'crdaDocumentUrl', '/api/builder/documents?path=' || (proof->>'documentPath'),
            'boundaryDimensions', jsonb_build_object('north', proof->>'north', 'south', proof->>'south', 'east', proof->>'east', 'west', proof->>'west')),
          'crdaReview', jsonb_build_object('reference', proof->>'crdaLpNumber', 'approved', true, 'reviewedAt', now(), 'reviewedBy', reviewer_id),
          'plotSpecifications', proof - 'documentPath'),
        "updatedAt" = now()
      WHERE id::text = r.project_id;
    ELSIF r.request_type = 'promote_top' THEN
      UPDATE public.builder_profiles SET promoted_at_top = true WHERE id = r.builder_id;
    ELSIF r.request_type = 'publish_banner' THEN
      UPDATE public.builder_profiles SET banner_active = true WHERE id = r.builder_id;
    ELSIF r.request_type = 'enable_chat' THEN
      UPDATE public.builder_profiles SET chat_enabled = true WHERE id = r.builder_id;
    ELSIF r.request_type = 'caption_change' AND coalesce(r.details->>'proposedCaption','') <> '' THEN
      UPDATE public.projects SET tagline = r.details->>'proposedCaption', "updatedAt" = now() WHERE id::text = r.project_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
    END IF;
  END IF;
  UPDATE public.builder_requests SET status = new_status, admin_notes = review_notes, updated_at = now() WHERE id = request_id;
  INSERT INTO public.builder_activity_logs(builder_id, builder_name, action_type, entity_id, details)
  VALUES (r.builder_id, r.builder_name, 'review_request', r.id::text, jsonb_build_object('reviewerId', reviewer_id, 'status', new_status));
END $$;
REVOKE ALL ON FUNCTION public.review_builder_request(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_builder_request(uuid,text,text,text) TO service_role;
COMMIT;
