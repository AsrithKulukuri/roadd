-- Add missing columns to the properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS "category" text,
ADD COLUMN IF NOT EXISTS "subtype" text,
ADD COLUMN IF NOT EXISTS "listingContext" text,
ADD COLUMN IF NOT EXISTS "attributes" jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "layoutMapUrl" text,
ADD COLUMN IF NOT EXISTS "floorPlanUrl" text,
ADD COLUMN IF NOT EXISTS "brochureUrl" text;

-- Create the projects table if it doesn't exist, or alter it to add any missing columns if it does
CREATE TABLE IF NOT EXISTS public.projects (
    id text primary key,
    slug text unique not null,
    name text not null,
    tagline text,
    description text,
    "projectType" text not null,
    "builderName" text not null,
    "builderLogoUrl" text,
    "builderPhone" text,
    "builderWhatsapp" text,
    location jsonb not null,
    "reraId" text,
    "reraApproved" boolean default false,
    "crdaApproved" boolean default false,
    "noBrokerage" boolean default false,
    "constructionStatus" text not null,
    "totalUnits" integer,
    "totalTowers" integer,
    "totalArea" text,
    phases jsonb default '[]'::jsonb,
    configurations jsonb default '[]'::jsonb,
    images jsonb not null default '[]'::jsonb,
    "coverImage" text,
    "videoUrl" text,
    "brochureUrl" text,
    highlights jsonb default '[]'::jsonb,
    facilities jsonb default '[]'::jsonb,
    "isFeatured" boolean default false,
    "isPublished" boolean default false,
    "viewCount" integer default 0,
    "createdAt" text not null,
    "updatedAt" text not null
);

-- Ensure RLS and Policies for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.projects;
CREATE POLICY "Projects are viewable by everyone" 
ON public.projects FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow project insert" ON public.projects;
CREATE POLICY "Allow project insert" 
ON public.projects FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
CREATE POLICY "Authenticated users can update projects" 
ON public.projects FOR UPDATE
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;
CREATE POLICY "Authenticated users can delete projects" 
ON public.projects FOR DELETE
TO authenticated 
USING (true);
