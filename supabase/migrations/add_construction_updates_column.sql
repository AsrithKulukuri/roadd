-- Add constructionUpdates JSONB column to the projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "constructionUpdates" jsonb default '[]'::jsonb;

-- Also reload the schema cache so Supabase API picks up the changes immediately
NOTIFY pgrst, 'reload schema';
