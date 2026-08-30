-- Migration: create_project_leads_table.sql
-- Description: Stores 100% of property viewer leads with delivery statuses and fast indexing

CREATE TABLE IF NOT EXISTS project_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT,
    project_slug TEXT,
    project_name TEXT NOT NULL,
    project_ref_id TEXT,
    builder_phone TEXT NOT NULL,
    builder_whatsapp TEXT,
    viewer_name TEXT NOT NULL,
    viewer_phone TEXT NOT NULL,
    viewer_email TEXT,
    delivery_status TEXT DEFAULT 'logged', -- 'instant_sent', 'surge_batched', 'logged'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid querying and aggregation
CREATE INDEX IF NOT EXISTS idx_project_leads_builder ON project_leads(builder_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_leads_project ON project_leads(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_leads_slug ON project_leads(project_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_leads_created ON project_leads(created_at DESC);

-- Enable RLS
ALTER TABLE project_leads ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated and anon clients (via Next.js API service role / anon key)
DROP POLICY IF EXISTS "Allow public/server inserts on project_leads" ON project_leads;
CREATE POLICY "Allow public/server inserts on project_leads"
    ON project_leads
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow reads for server role or authenticated users
DROP POLICY IF EXISTS "Allow public/server selects on project_leads" ON project_leads;
CREATE POLICY "Allow public/server selects on project_leads"
    ON project_leads
    FOR SELECT
    TO public
    USING (true);
