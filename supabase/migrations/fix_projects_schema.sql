-- Fix for existing projects table that might be missing recently added columns
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "tagline" text,
ADD COLUMN IF NOT EXISTS "crdaApproved" boolean default false,
ADD COLUMN IF NOT EXISTS "noBrokerage" boolean default false,
ADD COLUMN IF NOT EXISTS "totalTowers" integer,
ADD COLUMN IF NOT EXISTS "facilities" jsonb default '[]'::jsonb;

-- Also reload the schema cache so Supabase API picks up the changes immediately
NOTIFY pgrst, 'reload schema';
