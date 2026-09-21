BEGIN;
ALTER TABLE public.listing_action_leads DROP CONSTRAINT IF EXISTS listing_action_leads_action_check;
ALTER TABLE public.listing_action_leads ADD CONSTRAINT listing_action_leads_action_check
  CHECK (action IN ('reveal_phone', 'whatsapp_click', 'callback_request', 'brochure_download', 'schedule_visit', 'information_request'));
COMMIT;
