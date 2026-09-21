-- Add locationHighlights JSONB column to the projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "locationHighlights" jsonb DEFAULT '[]'::jsonb;

-- Also reload the schema cache so Supabase API picks up the changes immediately
NOTIFY pgrst, 'reload schema';
