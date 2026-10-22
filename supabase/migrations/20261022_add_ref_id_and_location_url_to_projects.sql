-- Add refId and locationUrl columns to the projects table for first-class persistence
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "refId" text,
ADD COLUMN IF NOT EXISTS "locationUrl" text;

-- Create index for quick refId lookup
CREATE INDEX IF NOT EXISTS idx_projects_ref_id ON public.projects ("refId");

-- Backfill refId and locationUrl from existing location JSONB
UPDATE public.projects
SET "refId" = COALESCE("refId", location->>'refId')
WHERE "refId" IS NULL AND location->>'refId' IS NOT NULL;

UPDATE public.projects
SET "locationUrl" = COALESCE("locationUrl", location->>'locationUrl', location->>'mapUrl', location->>'googleMapsUrl')
WHERE "locationUrl" IS NULL AND (location->>'locationUrl' IS NOT NULL OR location->>'mapUrl' IS NOT NULL OR location->>'googleMapsUrl' IS NOT NULL);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
