-- Migration: Builder Portal Features Expansion (P1, P2, P4, P5)
-- Features: Unit Inventory Matrix, Construction Milestones, Digital Brochure Tracker, Sales Lead Routing

-- 1. Project Inventory Units (P2)
CREATE TABLE IF NOT EXISTS public.project_inventory_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    builder_id TEXT,
    unit_number TEXT NOT NULL,
    block_or_tower TEXT DEFAULT 'Tower A',
    floor_number INT DEFAULT 1,
    unit_type TEXT DEFAULT '3 BHK',
    facing TEXT DEFAULT 'East',
    size_sqft INT DEFAULT 1650,
    price_total NUMERIC DEFAULT 6500000,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'under_token', 'sold')),
    token_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for speedy queries by project
CREATE INDEX IF NOT EXISTS idx_inventory_project_id ON public.project_inventory_units(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.project_inventory_units(status);

-- 2. Project Construction Milestones (P4)
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    builder_id TEXT,
    stage_name TEXT NOT NULL,
    stage_order INT DEFAULT 1,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('completed', 'in_progress', 'upcoming')),
    completion_percentage INT DEFAULT 0,
    target_date TEXT,
    completed_date TEXT,
    notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON public.project_milestones(project_id);

-- 3. Digital Brochure Engagement (P5)
CREATE TABLE IF NOT EXISTS public.brochure_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    builder_id TEXT,
    viewer_ip TEXT,
    dwell_seconds INT DEFAULT 0,
    referrer TEXT,
    device_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brochure_project_id ON public.brochure_analytics(project_id);

-- Enable RLS with permissive public / service role policies for demo
ALTER TABLE public.project_inventory_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brochure_analytics ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access project_inventory_units" ON public.project_inventory_units;
    CREATE POLICY "Public access project_inventory_units" ON public.project_inventory_units FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access project_milestones" ON public.project_milestones;
    CREATE POLICY "Public access project_milestones" ON public.project_milestones FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access brochure_analytics" ON public.brochure_analytics;
    CREATE POLICY "Public access brochure_analytics" ON public.brochure_analytics FOR ALL USING (true) WITH CHECK (true);
END $$;
