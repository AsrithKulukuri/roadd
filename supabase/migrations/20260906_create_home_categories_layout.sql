-- Migration: Ensure homepage_layouts table exists and seed default browse_categories if not set
CREATE TABLE IF NOT EXISTS public.homepage_layouts (
  id TEXT PRIMARY KEY DEFAULT 'default',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.homepage_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read homepage layouts" ON public.homepage_layouts;
CREATE POLICY "Public can read homepage layouts"
ON public.homepage_layouts FOR SELECT
TO public
USING (true);

-- Seed browse_categories with 4 active categories if missing
INSERT INTO public.homepage_layouts (id, sections, updated_at)
VALUES (
  'browse_categories',
  '[
    {
      "id": "new-listings",
      "name": "New Listings",
      "subtitle": "Freshly added properties",
      "badge": "Last 30 days",
      "badgeClass": "bg-white text-slate-900 font-bold shadow-md border border-slate-200/80 backdrop-blur-md",
      "href": "/search?type=buy&sort=newest",
      "type": "apartment",
      "icon": "Sparkles",
      "description": "Freshly added properties",
      "count": 12450,
      "image": "/images/categories/new_listings_img_1786320051269.png",
      "isFeatured": true
    },
    {
      "id": "new-apartments",
      "name": "New Apartments",
      "subtitle": "Modern flats & high-rises",
      "href": "/search?type=buy&propertyType=apartment",
      "type": "apartment",
      "icon": "Building2",
      "description": "Modern flats & high-rises",
      "count": 340,
      "image": "/images/categories/new_apartments_img_1786320061003.png",
      "isFeatured": true
    },
    {
      "id": "new-villas",
      "name": "New Villas",
      "subtitle": "Luxury standalone villas",
      "badge": "Premium",
      "badgeClass": "bg-white text-slate-900 font-bold shadow-md border border-slate-200/80 backdrop-blur-md",
      "href": "/search?type=buy&propertyType=villa",
      "type": "villa",
      "icon": "Home",
      "description": "Luxury standalone villas",
      "count": 18,
      "image": "/images/categories/new_villas_img_1786320073700.png",
      "isFeatured": true
    },
    {
      "id": "individual",
      "name": "Individual Homes",
      "subtitle": "Independent homes & bungalows",
      "href": "/search?type=buy&propertyType=independent-house",
      "type": "independent-house",
      "icon": "House",
      "description": "Independent homes & bungalows",
      "count": 95,
      "image": "/images/categories/individual_houses_img_1786320084215.png",
      "isFeatured": true
    }
  ]'::jsonb,
  timezone('utc'::text, now())
)
ON CONFLICT (id) DO NOTHING;
