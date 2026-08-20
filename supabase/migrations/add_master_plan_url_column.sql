-- Add masterPlanUrl column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "masterPlanUrl" text,
ADD COLUMN IF NOT EXISTS "master_plan_url" text;

-- Notify PostgREST to reload the schema cache immediately
NOTIFY pgrst, 'reload schema';
