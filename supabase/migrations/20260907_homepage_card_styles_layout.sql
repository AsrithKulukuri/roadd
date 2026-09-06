-- ==============================================================================
-- Migration: Homepage Shelves Layout & Card Design System
-- Table: public.homepage_layouts
-- ==============================================================================

-- 1. Create table if not exists (holds atomic JSONB shelf definitions)
CREATE TABLE IF NOT EXISTS public.homepage_layouts (
  id TEXT PRIMARY KEY DEFAULT 'default',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.homepage_layouts ENABLE ROW LEVEL SECURITY;

-- 3. Public read policy (Homepage can display published shelves)
DROP POLICY IF EXISTS "Public can read homepage layouts" ON public.homepage_layouts;
CREATE POLICY "Public can read homepage layouts"
ON public.homepage_layouts FOR SELECT
TO public
USING (true);

-- Note: Writes (UPSERT/PUT) are safely performed from the server API 
-- (/api/home-sections) using the Supabase service-role admin client 
-- after verifying administrator session authentication (requireAdmin).
