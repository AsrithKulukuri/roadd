BEGIN;
ALTER TABLE public.listing_action_leads
  DROP CONSTRAINT IF EXISTS listing_action_leads_user_id_listing_type_listing_id_action_ac_key;
ALTER TABLE public.listing_action_leads
  DROP CONSTRAINT IF EXISTS listing_action_leads_user_id_listing_type_listing_id_action_key;
CREATE INDEX IF NOT EXISTS idx_listing_action_leads_lookup
  ON public.listing_action_leads (listing_type, listing_id, created_at DESC);
COMMIT;
