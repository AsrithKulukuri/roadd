-- Add displayCategory column to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS "displayCategory" text;

-- Add displayCategory column to projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS "displayCategory" text;
