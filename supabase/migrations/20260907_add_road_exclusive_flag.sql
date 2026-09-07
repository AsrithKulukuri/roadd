-- Migration: Add isRoadExclusive to properties and projects tables
-- Enables marking properties and projects as "ROAD Exclusive"

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS "isRoadExclusive" BOOLEAN DEFAULT false;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS "isRoadExclusive" BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_properties_road_exclusive 
  ON public.properties ("isRoadExclusive") 
  WHERE "isRoadExclusive" = true;

CREATE INDEX IF NOT EXISTS idx_projects_road_exclusive 
  ON public.projects ("isRoadExclusive") 
  WHERE "isRoadExclusive" = true;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
