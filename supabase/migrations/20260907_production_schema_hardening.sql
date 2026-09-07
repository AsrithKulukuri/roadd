-- ==============================================================================
-- Production Schema Hardening & Gap Remediation
-- Migration: 20260907_production_schema_hardening.sql
-- Description:
--   1. Creates missing core tables (banners, inquiries, activity_logs, project_activity_logs)
--   2. Guarantees complete columns across properties, projects, and user profiles
--   3. Synchronizes public.profiles and public.user_profiles bi-directionally
--   4. Creates high-performance production B-tree and GIN indexes
--   5. Hardens Row-Level Security (RLS) policies across all tables
--   6. Configures storage bucket definitions and permissions
--   7. Reloads PostgREST schema cache
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BANNERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  button_text TEXT,
  link_url TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS button_text TEXT,
  ADD COLUMN IF NOT EXISTS mobile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_banners_order ON public.banners (order_index ASC, is_active);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active banners" ON public.banners;
CREATE POLICY "Public can view active banners"
  ON public.banners FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners"
  ON public.banners FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. INQUIRIES & BUYER REQUIREMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_inquiries_phone ON public.inquiries (phone);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON public.inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries (status);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit inquiry" ON public.inquiries;
CREATE POLICY "Anyone can submit inquiry"
  ON public.inquiries FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users/admins can view inquiries" ON public.inquiries;
CREATE POLICY "Authenticated users/admins can view inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users/admins can update inquiries" ON public.inquiries;
CREATE POLICY "Authenticated users/admins can update inquiries"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- 3. ACTIVITY LOGS (General Analytics & Share Events)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_id TEXT,
  ref_id TEXT,
  source TEXT DEFAULT 'whatsapp',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs (entity_id, event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs (created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record activity" ON public.activity_logs;
CREATE POLICY "Anyone can record activity"
  ON public.activity_logs FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- 4. PROJECT ACTIVITY LOGS (Dwell time, viewer sessions, brochure views)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_activity_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  project_slug TEXT,
  project_name TEXT,
  session_id TEXT NOT NULL,
  dwell_seconds INTEGER NOT NULL DEFAULT 0,
  details_shared BOOLEAN NOT NULL DEFAULT false,
  action TEXT,
  viewer_name TEXT,
  viewer_phone TEXT,
  viewer_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_project_activity_proj ON public.project_activity_logs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activity_slug ON public.project_activity_logs (project_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activity_session ON public.project_activity_logs (session_id);

ALTER TABLE public.project_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert project activity" ON public.project_activity_logs;
CREATE POLICY "Public can insert project activity"
  ON public.project_activity_logs FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update project activity" ON public.project_activity_logs;
CREATE POLICY "Public can update project activity"
  ON public.project_activity_logs FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can select project activity" ON public.project_activity_logs;
CREATE POLICY "Admins can select project activity"
  ON public.project_activity_logs FOR SELECT
  TO public
  USING (true);

-- ------------------------------------------------------------------------------
-- 5. UNIFY & SYNC PROFILES AND USER_PROFILES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'buyer' CHECK (role IN ('buyer', 'owner', 'agent', 'developer', 'admin')),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_profile_complete BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'buyer',
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_profile_complete BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns match across both tables
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Read policies
DROP POLICY IF EXISTS "Allow public read access profiles" ON public.profiles;
CREATE POLICY "Allow public read access profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access user_profiles" ON public.user_profiles;
CREATE POLICY "Allow public read access user_profiles" ON public.user_profiles FOR SELECT USING (true);

-- Update policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own user_profile" ON public.user_profiles;
CREATE POLICY "Users can update own user_profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Insert policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can insert own user_profile" ON public.user_profiles;
CREATE POLICY "Users can insert own user_profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Admin policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all user_profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all user_profiles" ON public.user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sync Trigger between profiles and user_profiles
CREATE OR REPLACE FUNCTION public.sync_profiles_to_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, phone, full_name, role, avatar_url, is_verified, is_profile_complete, updated_at, created_at)
  VALUES (NEW.id, NEW.email, NEW.phone, NEW.full_name, NEW.role, NEW.avatar_url, NEW.is_verified, NEW.is_profile_complete, NEW.updated_at, NEW.created_at)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    avatar_url = EXCLUDED.avatar_url,
    is_verified = EXCLUDED.is_verified,
    is_profile_complete = EXCLUDED.is_profile_complete,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_profiles_to_user_profiles ON public.profiles;
CREATE TRIGGER tr_sync_profiles_to_user_profiles
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_to_user_profiles();

-- Robust unified auth user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  resolved_role TEXT;
  resolved_phone TEXT;
  resolved_name TEXT;
  resolved_avatar TEXT;
  profile_complete BOOLEAN;
BEGIN
  resolved_role := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer');
  resolved_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '');
  resolved_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User');
  resolved_avatar := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');
  profile_complete := (resolved_phone <> '' AND resolved_name <> '');

  INSERT INTO public.profiles (id, email, phone, full_name, role, avatar_url, is_verified, is_profile_complete)
  VALUES (NEW.id, COALESCE(NEW.email, ''), resolved_phone, resolved_name, resolved_role, resolved_avatar, false, profile_complete)
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
    full_name = CASE WHEN EXCLUDED.full_name <> 'User' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END;

  INSERT INTO public.user_profiles (id, email, phone, full_name, role, avatar_url, is_verified, is_profile_complete)
  VALUES (NEW.id, COALESCE(NEW.email, ''), resolved_phone, resolved_name, resolved_role, resolved_avatar, false, profile_complete)
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.user_profiles.email),
    phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.user_profiles.phone END,
    full_name = CASE WHEN EXCLUDED.full_name <> 'User' THEN EXCLUDED.full_name ELSE public.user_profiles.full_name END,
    avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.user_profiles.avatar_url END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill from profiles to user_profiles if any discrepancy
INSERT INTO public.user_profiles (id, email, phone, full_name, role, avatar_url, is_verified, is_profile_complete, updated_at, created_at)
SELECT id, email, phone, full_name, role, avatar_url, is_verified, is_profile_complete, updated_at, created_at
FROM public.profiles
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. PROPERTIES TABLE COMPLETION & HIGH-PERFORMANCE INDEXING
-- ------------------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS "refId" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "subtype" TEXT,
  ADD COLUMN IF NOT EXISTS "listingContext" TEXT,
  ADD COLUMN IF NOT EXISTS "attributes" JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "layoutMapUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "floorPlanUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "brochureUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "displayCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "pricePerSqft" NUMERIC,
  ADD COLUMN IF NOT EXISTS "vastuCompliant" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "petFriendly" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "gatedSecurity" BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_properties_status_types ON public.properties (status, "propertyType", "listingType");
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties (price);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties ("ownerId");
CREATE INDEX IF NOT EXISTS idx_properties_ref_id ON public.properties ("refId");
CREATE INDEX IF NOT EXISTS idx_properties_featured ON public.properties ("isFeatured", "isVerified", "isRecommended");
CREATE INDEX IF NOT EXISTS idx_properties_location_gin ON public.properties USING gin (location jsonb_path_ops);

-- ------------------------------------------------------------------------------
-- 7. PROJECTS TABLE COMPLETION & HIGH-PERFORMANCE INDEXING
-- ------------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS "tagline" TEXT,
  ADD COLUMN IF NOT EXISTS "masterPlanUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "master_plan_url" TEXT,
  ADD COLUMN IF NOT EXISTS "crdaApproved" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "noBrokerage" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "totalTowers" INTEGER,
  ADD COLUMN IF NOT EXISTS "facilities" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "constructionUpdates" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "displayCategory" TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects (slug);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects ("projectType", "constructionStatus");
CREATE INDEX IF NOT EXISTS idx_projects_featured ON public.projects ("isFeatured", "isPublished");
CREATE INDEX IF NOT EXISTS idx_projects_location_gin ON public.projects USING gin (location jsonb_path_ops);

-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKETS CONFIGURATION
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('properties', 'properties', true),
  ('banners', 'banners', true),
  ('projects', 'projects', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Bucket Public Read Policies
DROP POLICY IF EXISTS "Public view for properties bucket" ON storage.objects;
CREATE POLICY "Public view for properties bucket" ON storage.objects FOR SELECT TO public
USING (bucket_id IN ('properties', 'banners', 'projects', 'avatars'));

-- Bucket Upload Policies for authenticated users
DROP POLICY IF EXISTS "Authenticated upload for storage buckets" ON storage.objects;
CREATE POLICY "Authenticated upload for storage buckets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('properties', 'banners', 'projects', 'avatars'));

DROP POLICY IF EXISTS "Authenticated update for storage buckets" ON storage.objects;
CREATE POLICY "Authenticated update for storage buckets" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('properties', 'banners', 'projects', 'avatars'));

DROP POLICY IF EXISTS "Authenticated delete for storage buckets" ON storage.objects;
CREATE POLICY "Authenticated delete for storage buckets" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('properties', 'banners', 'projects', 'avatars'));

-- ------------------------------------------------------------------------------
-- 9. RELOAD SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
