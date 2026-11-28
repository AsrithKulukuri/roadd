BEGIN;
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.listing_action_leads'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.listing_action_leads DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS listing_action_leads_listing_created_idx
  ON public.listing_action_leads (listing_type, listing_id, created_at DESC);
COMMIT;
