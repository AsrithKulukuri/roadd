-- ==============================================================================
-- Production-Ready Migration: Homepage Shelves Layout & Card Design System
-- Table: public.homepage_layouts & public.homepage_layout_revisions
-- ==============================================================================

-- 1. Create table if not exists (holds atomic JSONB shelf definitions)
CREATE TABLE IF NOT EXISTS public.homepage_layouts (
  id TEXT PRIMARY KEY DEFAULT 'default',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT homepage_layouts_sections_is_valid_json CHECK (jsonb_typeof(sections) IN ('array', 'object'))
);

-- 2. GIN index for high-performance sub-millisecond JSON lookups
CREATE INDEX IF NOT EXISTS idx_homepage_layouts_sections_gin 
ON public.homepage_layouts USING gin (sections jsonb_path_ops);

-- 3. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_homepage_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_homepage_layouts_updated_at ON public.homepage_layouts;
CREATE TRIGGER tr_homepage_layouts_updated_at
  BEFORE UPDATE ON public.homepage_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_homepage_layouts_updated_at();

-- 4. Production Revision History / Audit Trail
-- Protects against accidental layout overrides, enabling 1-click rollbacks
CREATE TABLE IF NOT EXISTS public.homepage_layout_revisions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  layout_id TEXT NOT NULL REFERENCES public.homepage_layouts(id) ON DELETE CASCADE,
  sections JSONB NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_homepage_revisions_layout_saved 
ON public.homepage_layout_revisions (layout_id, saved_at DESC);

-- Trigger: Automatically snapshot previous version before update
CREATE OR REPLACE FUNCTION public.snapshot_homepage_layout_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only snapshot if sections actually changed
  IF OLD.sections IS DISTINCT FROM NEW.sections THEN
    INSERT INTO public.homepage_layout_revisions (layout_id, sections, saved_at)
    VALUES (OLD.id, OLD.sections, timezone('utc'::text, now()));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_snapshot_homepage_layout ON public.homepage_layouts;
CREATE TRIGGER tr_snapshot_homepage_layout
  BEFORE UPDATE ON public.homepage_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_homepage_layout_revision();

-- 5. Seed default layout row if not present
INSERT INTO public.homepage_layouts (id, sections, updated_at)
VALUES ('default', '[]'::jsonb, timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.homepage_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_layout_revisions ENABLE ROW LEVEL SECURITY;

-- 7. Public Read Policies
DROP POLICY IF EXISTS "Public can read homepage layouts" ON public.homepage_layouts;
CREATE POLICY "Public can read homepage layouts"
ON public.homepage_layouts FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins can read layout revisions" ON public.homepage_layout_revisions;
CREATE POLICY "Admins can read layout revisions"
ON public.homepage_layout_revisions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 8. Admin Direct Write Policies (in addition to service-role API access)
DROP POLICY IF EXISTS "Admins can manage homepage layouts" ON public.homepage_layouts;
CREATE POLICY "Admins can manage homepage layouts"
ON public.homepage_layouts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 9. Helper View: Unnest active shelf items to quickly detect deleted/orphaned properties
CREATE OR REPLACE VIEW public.homepage_active_shelf_items AS
SELECT
  l.id AS layout_id,
  section->>'id' AS shelf_id,
  section->>'title' AS shelf_title,
  section->>'cardStyle' AS card_style,
  item->>'id' AS item_id,
  item->>'type' AS item_type,
  item->>'customHeadline' AS custom_headline,
  item->>'customBadge' AS custom_badge,
  (item->>'progressPercentage')::numeric AS progress_percentage
FROM public.homepage_layouts l
CROSS JOIN LATERAL jsonb_array_elements(l.sections) AS section
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(section->'items', '[]'::jsonb)) AS item
WHERE jsonb_typeof(l.sections) = 'array';
