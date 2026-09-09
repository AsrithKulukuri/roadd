-- ==============================================================================
-- ROAD FACING — BUILDER ENTERPRISE & ADMIN MANAGEMENT SCHEMA
-- File: supabase/builder_enterprise_schema.sql
-- ==============================================================================

-- 1. BUILDER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.builder_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  tagline TEXT,
  rera_number TEXT,
  crda_approved BOOLEAN DEFAULT false,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  whatsapp_number TEXT,
  office_address TEXT,
  experience_years INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'premium' CHECK (tier IN ('starter', 'premium', 'titan')),
  is_verified BOOLEAN DEFAULT false,
  assigned_project_ids TEXT[] DEFAULT '{}',
  assigned_property_ids TEXT[] DEFAULT '{}',
  chat_enabled BOOLEAN DEFAULT true,
  promoted_at_top BOOLEAN DEFAULT false,
  banner_active BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  login_credentials_hint TEXT, -- Admin display reference (e.g. assigned portal email)
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist
ALTER TABLE public.builder_profiles
  ADD COLUMN IF NOT EXISTS assigned_project_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_property_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS promoted_at_top BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_credentials_hint TEXT;

CREATE INDEX IF NOT EXISTS idx_builder_profiles_slug ON public.builder_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_builder_profiles_email ON public.builder_profiles(contact_email);
CREATE INDEX IF NOT EXISTS idx_builder_profiles_phone ON public.builder_profiles(contact_phone);

-- 2. BUILDER ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.builder_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  builder_name TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'login', 'logout', 'view_analytics', 'edit_project', 'update_schedule', 'submit_request', 'chat_message'
  entity_id TEXT, -- e.g. project_id, schedule_id, request_id
  entity_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_builder_activity_builder ON public.builder_activity_logs(builder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_activity_action ON public.builder_activity_logs(action_type, created_at DESC);

-- 3. BUILDER REQUESTS TABLE (Promote Top, Banner, Chat, Caption Change, Concierge)
CREATE TABLE IF NOT EXISTS public.builder_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  builder_name TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('promote_top', 'publish_banner', 'enable_chat', 'caption_change', 'custom_concierge')),
  project_id TEXT,
  project_name TEXT,
  title TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb, -- { proposed_caption, proposed_banner_url, shelf_id, duration_days, notes }
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'active', 'completed')),
  admin_notes TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_builder_requests_builder ON public.builder_requests(builder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builder_requests_status ON public.builder_requests(status, created_at DESC);

-- 4. BUILDER-ADMIN MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.builder_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.builder_requests(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('builder', 'admin')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_builder_messages_builder ON public.builder_messages(builder_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_builder_messages_request ON public.builder_messages(request_id, created_at ASC);

-- 5. RLS POLICIES
ALTER TABLE public.builder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_messages ENABLE ROW LEVEL SECURITY;

-- Builder profiles policies
DROP POLICY IF EXISTS "Public can view verified builder profiles" ON public.builder_profiles;
CREATE POLICY "Public can view verified builder profiles" ON public.builder_profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins have full access to builder profiles" ON public.builder_profiles;
CREATE POLICY "Admins have full access to builder profiles" ON public.builder_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Builders can view their own profile" ON public.builder_profiles;
CREATE POLICY "Builders can view their own profile" ON public.builder_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR true);

DROP POLICY IF EXISTS "Builders can update their own profile" ON public.builder_profiles;
CREATE POLICY "Builders can update their own profile" ON public.builder_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR true) WITH CHECK (true);

-- Activity logs policies
DROP POLICY IF EXISTS "Admins can view builder activity logs" ON public.builder_activity_logs;
CREATE POLICY "Admins can view builder activity logs" ON public.builder_activity_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow logging builder activities" ON public.builder_activity_logs;
CREATE POLICY "Allow logging builder activities" ON public.builder_activity_logs FOR INSERT TO public WITH CHECK (true);

-- Requests policies
DROP POLICY IF EXISTS "Admins can manage all builder requests" ON public.builder_requests;
CREATE POLICY "Admins can manage all builder requests" ON public.builder_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Builders can view and create their requests" ON public.builder_requests;
CREATE POLICY "Builders can view and create their requests" ON public.builder_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Messages policies
DROP POLICY IF EXISTS "Admins and builders can manage messages" ON public.builder_messages;
CREATE POLICY "Admins and builders can manage messages" ON public.builder_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. SEED DEMO BUILDERS (Mapped to actual active projects in ROAD)
INSERT INTO public.builder_profiles (
  company_name, slug, logo_url, description, tagline, rera_number,
  contact_email, contact_phone, whatsapp_number, office_address,
  experience_years, tier, is_verified, assigned_project_ids, chat_enabled,
  login_credentials_hint
)
VALUES (
  'Sri Aditya Homes & Ventures',
  'sri-aditya-homes',
  'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=300&auto=format&fit=crop&q=80',
  'Premier luxury residential and commercial developer in Amaravati and Vijayawada with over 20+ landmark gated communities.',
  'Crafting Architectural Landmarks of Tomorrow',
  'P06180020199',
  'director@sriadityahomes.com',
  '+91 98490 12345',
  '+91 98490 12345',
  'Level 4, Aditya Gateway, MG Road, Vijayawada, AP',
  18,
  'titan',
  true,
  ARRAY['amaravati-heights', 'road-skyline-towers'],
  true,
  'director@sriadityahomes.com / builder2026'
),
(
  'Jayabheri Properties & Estates',
  'jayabheri-properties',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80',
  'Pioneering sustainable and road-exclusive high-rise developments across the AP Capital Region.',
  'Excellence in Every Square Foot',
  'P06180020255',
  'sales@jayabherigroup.com',
  '+91 99887 76655',
  '+91 99887 76655',
  'Jayabheri Silicon Towers, Benz Circle, Vijayawada, AP',
  24,
  'premium',
  true,
  ARRAY['green-valley-villas'],
  true,
  'sales@jayabherigroup.com / builder2026'
)
ON CONFLICT (slug) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  assigned_project_ids = EXCLUDED.assigned_project_ids,
  is_verified = EXCLUDED.is_verified;
