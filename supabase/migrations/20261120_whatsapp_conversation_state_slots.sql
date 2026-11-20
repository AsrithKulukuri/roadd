-- Migration: Enrich whatsapp_conversation_state with slot-filling and multi-turn real estate memory
-- Supports Phase 2: Per-customer slot state machine, anaphoric follow-up resolution, and shortlisted items

ALTER TABLE public.whatsapp_conversation_state 
  ADD COLUMN IF NOT EXISTS last_displayed_ref_ids text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS shortlisted_ref_ids text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS last_viewed_ref_id text,
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'discovery',
  ADD COLUMN IF NOT EXISTS buying_renting_intent text DEFAULT 'buy',
  ADD COLUMN IF NOT EXISTS slots jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

COMMENT ON COLUMN public.whatsapp_conversation_state.last_displayed_ref_ids IS 'Ordered array of Ref IDs presented in the most recent search result for follow-up resolution ("show the second one")';
COMMENT ON COLUMN public.whatsapp_conversation_state.slots IS 'Persistent structured property preference slots: location, bhk, budget bounds, property types';

