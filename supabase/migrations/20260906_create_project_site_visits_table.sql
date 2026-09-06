-- Migration: 20260906_create_project_site_visits_table.sql
-- Description: Stores site visit bookings and tour appointments with full persistence and RLS policies

CREATE TABLE IF NOT EXISTS public.project_site_visits (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    project_slug TEXT,
    project_name TEXT NOT NULL,
    project_location TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    builder_name TEXT,
    builder_phone TEXT,
    visit_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    customer_notified BOOLEAN NOT NULL DEFAULT false,
    builder_notified BOOLEAN NOT NULL DEFAULT false,
    reminder_sent BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid querying and filtering
CREATE INDEX IF NOT EXISTS idx_site_visits_status ON public.project_site_visits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_project ON public.project_site_visits(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_phone ON public.project_site_visits(customer_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_date ON public.project_site_visits(visit_date, status);
CREATE INDEX IF NOT EXISTS idx_site_visits_created ON public.project_site_visits(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.project_site_visits ENABLE ROW LEVEL SECURITY;

-- Allow public insert (frontend visitors booking a tour from project or property page)
DROP POLICY IF EXISTS "Allow public insert on project_site_visits" ON public.project_site_visits;
CREATE POLICY "Allow public insert on project_site_visits"
    ON public.project_site_visits
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow public and authenticated select
DROP POLICY IF EXISTS "Allow public select on project_site_visits" ON public.project_site_visits;
CREATE POLICY "Allow public select on project_site_visits"
    ON public.project_site_visits
    FOR SELECT
    TO public
    USING (true);

-- Allow public and authenticated update (for status updates and reminders)
DROP POLICY IF EXISTS "Allow public update on project_site_visits" ON public.project_site_visits;
CREATE POLICY "Allow public update on project_site_visits"
    ON public.project_site_visits
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Allow public and authenticated delete
DROP POLICY IF EXISTS "Allow public delete on project_site_visits" ON public.project_site_visits;
CREATE POLICY "Allow public delete on project_site_visits"
    ON public.project_site_visits
    FOR DELETE
    TO public
    USING (true);
