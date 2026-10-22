-- Fix Supabase Security Advisor Critical Issue:
-- "View public.homepage_active_shelf_items is defined with the SECURITY DEFINER property"
--
-- In PostgreSQL 15+, setting security_invoker = true ensures the view enforces the
-- row-level security (RLS) policies and permissions of the invoking/querying user
-- rather than the view owner (SECURITY DEFINER behavior).

CREATE OR REPLACE VIEW public.homepage_active_shelf_items
WITH (security_invoker = true) AS
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

-- Ensure security_invoker is explicitly enabled on existing view
ALTER VIEW public.homepage_active_shelf_items SET (security_invoker = true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
