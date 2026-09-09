BEGIN;
CREATE TABLE IF NOT EXISTS public.listing_action_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('project','property')), listing_id text NOT NULL,
  listing_slug text, listing_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('reveal_phone','whatsapp_click','callback_request','brochure_download')),
  action_day date NOT NULL, buyer_name text, buyer_phone text, buyer_email text, recipient_phone text,
  source text NOT NULL, consent_version text NOT NULL,
  builder_notified boolean NOT NULL DEFAULT false, admin_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,listing_type,listing_id,action,action_day)
);
ALTER TABLE public.listing_action_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_action_leads FROM anon, authenticated;
GRANT ALL ON public.listing_action_leads TO service_role;
CREATE TABLE IF NOT EXISTS public.user_saved_listings (
  user_id text NOT NULL, listing_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,listing_id)
);
ALTER TABLE public.user_saved_listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_saved_listings FROM anon, authenticated;
GRANT ALL ON public.user_saved_listings TO service_role;
-- Keep existing authenticated favourites when switching to the cookie-authenticated API.
DO $$ BEGIN
  IF to_regclass('public.saved_properties') IS NOT NULL THEN
    INSERT INTO public.user_saved_listings(user_id, listing_id)
    SELECT user_id::text, property_id::text FROM public.saved_properties
    WHERE user_id IS NOT NULL AND property_id IS NOT NULL ON CONFLICT DO NOTHING;
  END IF;
END $$;
-- Public reads now go through /api/listings, which removes contact/document fields.
-- Deploy the application with this migration; old direct browser reads will be denied.
REVOKE SELECT ON public.projects, public.properties FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.projects, public.properties TO service_role;
COMMIT;
