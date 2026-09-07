-- ==============================================================================
-- ROAD FACING — MASTER PRODUCTION DATABASE SCHEMA
-- File: supabase/master_production_schema.sql
-- Description: Single idempotent script to initialize or audit the entire database
-- Safe to execute repeatedly on fresh or existing Supabase production environments.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- SECTION 1: USER PROFILES & AUTHENTICATION
-- ==============================================================================

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

-- Sync trigger: keeps user_profiles updated whenever profiles changes
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

-- Unified Auth Trigger: Populates both profiles and user_profiles upon signup
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

-- Phone OTPs table for WhatsApp & SMS login
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ip_address TEXT,
  session_token TEXT
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON public.phone_otps(phone, verified, expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_otps_created ON public.phone_otps(created_at DESC);

-- ==============================================================================
-- SECTION 2: PROPERTIES & PROJECTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.properties (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  "refId" TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL,
  "pricePerSqft" NUMERIC,
  "propertyType" TEXT NOT NULL,
  "listingType" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  balconies INTEGER DEFAULT 0,
  floors INTEGER,
  "totalFloors" INTEGER,
  "floorNumber" INTEGER,
  parking INTEGER DEFAULT 0,
  "roadWidth" NUMERIC,
  "undividedShare" NUMERIC,
  area NUMERIC,
  "carpetArea" NUMERIC,
  "builtUpArea" NUMERIC,
  furnishing TEXT,
  facing TEXT,
  "ageOfProperty" INTEGER,
  "possessionDate" TEXT,
  "isReadyToMove" BOOLEAN DEFAULT true,
  location JSONB NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  "coverImage" TEXT,
  "galleryImages" JSONB DEFAULT '[]'::jsonb,
  "videoUrl" TEXT,
  "layoutMapUrl" TEXT,
  "floorPlanUrl" TEXT,
  "brochureUrl" TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '{}'::jsonb,
  "reraId" TEXT,
  "category" TEXT,
  "subtype" TEXT,
  "listingContext" TEXT,
  "displayCategory" TEXT,
  "isVerified" BOOLEAN DEFAULT false,
  "isFeatured" BOOLEAN DEFAULT false,
  "isRecommended" BOOLEAN DEFAULT false,
  "isPremium" BOOLEAN DEFAULT false,
  "showOnMap" BOOLEAN DEFAULT true,
  "vastuCompliant" BOOLEAN DEFAULT false,
  "petFriendly" BOOLEAN DEFAULT false,
  "gatedSecurity" BOOLEAN DEFAULT false,
  "ownerId" TEXT NOT NULL,
  "ownerName" TEXT,
  "ownerPhone" TEXT NOT NULL,
  "ownerEmail" TEXT,
  "ownerAvatar" TEXT,
  "ownerType" TEXT DEFAULT 'owner',
  "isOwnerVerified" BOOLEAN DEFAULT false,
  "viewCount" INTEGER DEFAULT 0,
  "savedCount" INTEGER DEFAULT 0,
  "enquiryCount" INTEGER DEFAULT 0,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "publishedAt" TEXT
);

-- Ensure all columns on properties
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

-- Saved Properties table
CREATE TABLE IF NOT EXISTS public.saved_properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_properties_user ON public.saved_properties (user_id);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  "projectType" TEXT NOT NULL,
  "builderName" TEXT NOT NULL,
  "builderLogoUrl" TEXT,
  "builderPhone" TEXT,
  "builderWhatsapp" TEXT,
  location JSONB NOT NULL,
  "reraId" TEXT,
  "reraApproved" BOOLEAN DEFAULT false,
  "crdaApproved" BOOLEAN DEFAULT false,
  "noBrokerage" BOOLEAN DEFAULT false,
  "constructionStatus" TEXT NOT NULL,
  "totalUnits" INTEGER,
  "totalTowers" INTEGER,
  "totalArea" TEXT,
  phases JSONB DEFAULT '[]'::jsonb,
  configurations JSONB DEFAULT '[]'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  "coverImage" TEXT,
  "videoUrl" TEXT,
  "brochureUrl" TEXT,
  "masterPlanUrl" TEXT,
  "master_plan_url" TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  facilities JSONB DEFAULT '[]'::jsonb,
  "constructionUpdates" JSONB DEFAULT '[]'::jsonb,
  "displayCategory" TEXT,
  "isFeatured" BOOLEAN DEFAULT false,
  "isPublished" BOOLEAN DEFAULT false,
  "viewCount" INTEGER DEFAULT 0,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

-- Ensure all columns on projects
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

-- ==============================================================================
-- SECTION 3: HOMEPAGE CURATION, BANNERS & LOCATIONS
-- ==============================================================================

-- Banners table
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

-- Trending Locations table
CREATE TABLE IF NOT EXISTS public.trending_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  image TEXT NOT NULL,
  properties_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Homepage Layouts table (holds shelves, categories, search phrases)
CREATE TABLE IF NOT EXISTS public.homepage_layouts (
  id TEXT PRIMARY KEY DEFAULT 'default',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT homepage_layouts_sections_is_valid_json CHECK (jsonb_typeof(sections) IN ('array', 'object'))
);

CREATE INDEX IF NOT EXISTS idx_homepage_layouts_sections_gin ON public.homepage_layouts USING gin (sections jsonb_path_ops);

-- Homepage Layout Revisions / Audit Trail
CREATE TABLE IF NOT EXISTS public.homepage_layout_revisions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  layout_id TEXT NOT NULL REFERENCES public.homepage_layouts(id) ON DELETE CASCADE,
  sections JSONB NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_homepage_revisions_layout_saved ON public.homepage_layout_revisions (layout_id, saved_at DESC);

-- Automatic Revision Snapshot Trigger
CREATE OR REPLACE FUNCTION public.snapshot_homepage_layout_revision()
RETURNS TRIGGER AS $$
BEGIN
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
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_homepage_layout_revision();

-- Active shelf items view
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

-- ==============================================================================
-- SECTION 4: LEADS, TOURS, INQUIRIES & ANALYTICS
-- ==============================================================================

-- Inquiries & Buyer Requirements
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

-- Project Leads
CREATE TABLE IF NOT EXISTS public.project_leads (
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
  delivery_status TEXT DEFAULT 'logged',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_leads_builder ON public.project_leads(builder_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_leads_project ON public.project_leads(project_id, created_at DESC);

-- Project Site Visits / Tour Appointments
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
  status TEXT NOT NULL DEFAULT 'scheduled',
  customer_notified BOOLEAN NOT NULL DEFAULT false,
  builder_notified BOOLEAN NOT NULL DEFAULT false,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_status ON public.project_site_visits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_project ON public.project_site_visits(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_phone ON public.project_site_visits(customer_phone, created_at DESC);

-- General Activity Logs
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

-- Project Detailed Activity Logs
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

-- ==============================================================================
-- SECTION 5: WHATSAPP ENTERPRISE & CONCIERGE CRM
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'buyer',
  tags TEXT[] DEFAULT '{}',
  opted_out BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id TEXT,
  target_audience TEXT NOT NULL,
  template_type TEXT NOT NULL,
  custom_message TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'draft',
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.whatsapp_campaign_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'pending',
  message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_idempotency (
  provider_message_id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_state (
  phone TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  current_intent TEXT DEFAULT 'GREETING',
  last_search JSONB DEFAULT '{}'::jsonb,
  selected_property_id TEXT,
  agent_mode BOOLEAN NOT NULL DEFAULT false,
  active_ticket_id TEXT,
  lead_id TEXT,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  user_name TEXT,
  user_id TEXT,
  purpose TEXT,
  budget_range TEXT,
  timeline TEXT,
  stage TEXT NOT NULL DEFAULT 'NEW',
  lead_score INT NOT NULL DEFAULT 10,
  interested_project_id TEXT,
  interested_project_name TEXT,
  notes TEXT,
  assigned_agent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT,
  phone TEXT NOT NULL,
  user_name TEXT,
  property_or_project_id TEXT NOT NULL,
  property_title TEXT NOT NULL,
  preferred_date DATE,
  preferred_time_slot TEXT,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  assigned_advisor TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_saved_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  property_or_project_id TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'property',
  title TEXT NOT NULL,
  location_text TEXT,
  price_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_support_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  user_name TEXT,
  user_role TEXT DEFAULT 'buyer',
  status TEXT DEFAULT 'bot',
  assigned_agent_id TEXT,
  assigned_agent_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  unread_admin_count INTEGER DEFAULT 0,
  unread_user_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.whatsapp_support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  user_name TEXT,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- SECTION 6: ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_layout_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_inbound_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_support_tickets ENABLE ROW LEVEL SECURITY;

-- Properties policies
DROP POLICY IF EXISTS "Public can view properties" ON public.properties;
CREATE POLICY "Public can view properties" ON public.properties FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Owners can update properties" ON public.properties;
CREATE POLICY "Owners can update properties" ON public.properties FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners can insert properties" ON public.properties;
CREATE POLICY "Owners can insert properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can delete properties" ON public.properties;
CREATE POLICY "Owners can delete properties" ON public.properties FOR DELETE TO authenticated USING (true);

-- Projects policies
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
CREATE POLICY "Public can view projects" ON public.projects FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Saved properties policies
DROP POLICY IF EXISTS "Users can view saved properties" ON public.saved_properties;
CREATE POLICY "Users can view saved properties" ON public.saved_properties FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save properties" ON public.saved_properties;
CREATE POLICY "Users can save properties" ON public.saved_properties FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave properties" ON public.saved_properties;
CREATE POLICY "Users can unsave properties" ON public.saved_properties FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Banners policies
DROP POLICY IF EXISTS "Public can view banners" ON public.banners;
CREATE POLICY "Public can view banners" ON public.banners FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Homepage layouts policies
DROP POLICY IF EXISTS "Public can view layouts" ON public.homepage_layouts;
CREATE POLICY "Public can view layouts" ON public.homepage_layouts FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage layouts" ON public.homepage_layouts;
CREATE POLICY "Admins can manage layouts" ON public.homepage_layouts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inquiries policies
DROP POLICY IF EXISTS "Public can submit inquiries" ON public.inquiries;
CREATE POLICY "Public can submit inquiries" ON public.inquiries FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view inquiries" ON public.inquiries;
CREATE POLICY "Admins can view inquiries" ON public.inquiries FOR SELECT TO authenticated USING (true);

-- Project leads policies
DROP POLICY IF EXISTS "Public can insert project leads" ON public.project_leads;
CREATE POLICY "Public can insert project leads" ON public.project_leads FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can select project leads" ON public.project_leads;
CREATE POLICY "Public can select project leads" ON public.project_leads FOR SELECT TO public USING (true);

-- Project site visits policies
DROP POLICY IF EXISTS "Public can insert site visits" ON public.project_site_visits;
CREATE POLICY "Public can insert site visits" ON public.project_site_visits FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can select site visits" ON public.project_site_visits;
CREATE POLICY "Public can select site visits" ON public.project_site_visits FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can update site visits" ON public.project_site_visits;
CREATE POLICY "Public can update site visits" ON public.project_site_visits FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Activity logs policies
DROP POLICY IF EXISTS "Public can insert activity logs" ON public.activity_logs;
CREATE POLICY "Public can insert activity logs" ON public.activity_logs FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);

-- Project activity logs policies
DROP POLICY IF EXISTS "Public can insert project activity logs" ON public.project_activity_logs;
CREATE POLICY "Public can insert project activity logs" ON public.project_activity_logs FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update project activity logs" ON public.project_activity_logs;
CREATE POLICY "Public can update project activity logs" ON public.project_activity_logs FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can select project activity logs" ON public.project_activity_logs;
CREATE POLICY "Admins can select project activity logs" ON public.project_activity_logs FOR SELECT TO public USING (true);

-- Trending locations policies
DROP POLICY IF EXISTS "Public can view trending locations" ON public.trending_locations;
CREATE POLICY "Public can view trending locations" ON public.trending_locations FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage trending locations" ON public.trending_locations;
CREATE POLICY "Admins can manage trending locations" ON public.trending_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Phone OTPs policy (Service role has full bypass; authenticated clients/admin)
DROP POLICY IF EXISTS "Service role access for phone_otps" ON public.phone_otps;
CREATE POLICY "Service role access for phone_otps" ON public.phone_otps FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp CRM policies
DROP POLICY IF EXISTS "Admin access for whatsapp_contacts" ON public.whatsapp_contacts;
CREATE POLICY "Admin access for whatsapp_contacts" ON public.whatsapp_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access for whatsapp_campaigns" ON public.whatsapp_campaigns;
CREATE POLICY "Admin access for whatsapp_campaigns" ON public.whatsapp_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access for whatsapp_campaign_recipients" ON public.whatsapp_campaign_recipients;
CREATE POLICY "Admin access for whatsapp_campaign_recipients" ON public.whatsapp_campaign_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access for whatsapp_leads" ON public.whatsapp_leads;
CREATE POLICY "Admin access for whatsapp_leads" ON public.whatsapp_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access for whatsapp_site_visits" ON public.whatsapp_site_visits;
CREATE POLICY "Admin access for whatsapp_site_visits" ON public.whatsapp_site_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access for whatsapp_saved_properties" ON public.whatsapp_saved_properties;
CREATE POLICY "Admin access for whatsapp_saved_properties" ON public.whatsapp_saved_properties FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access for whatsapp_conversation_state" ON public.whatsapp_conversation_state;
CREATE POLICY "Admin access for whatsapp_conversation_state" ON public.whatsapp_conversation_state FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access for whatsapp_inbound_idempotency" ON public.whatsapp_inbound_idempotency;
CREATE POLICY "Admin access for whatsapp_inbound_idempotency" ON public.whatsapp_inbound_idempotency FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access for whatsapp_support_conversations" ON public.whatsapp_support_conversations;
CREATE POLICY "Admin access for whatsapp_support_conversations" ON public.whatsapp_support_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin access for whatsapp_support_tickets" ON public.whatsapp_support_tickets;
CREATE POLICY "Admin access for whatsapp_support_tickets" ON public.whatsapp_support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- SECTION 7: STORAGE BUCKETS & POLICIES
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('properties', 'properties', true),
  ('banners', 'banners', true),
  ('projects', 'projects', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public view for storage buckets" ON storage.objects;
CREATE POLICY "Public view for storage buckets" ON storage.objects FOR SELECT TO public
USING (bucket_id IN ('properties', 'banners', 'projects', 'avatars'));

DROP POLICY IF EXISTS "Authenticated upload for storage buckets" ON storage.objects;
CREATE POLICY "Authenticated upload for storage buckets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('properties', 'banners', 'projects', 'avatars'));

DROP POLICY IF EXISTS "Authenticated update for storage buckets" ON storage.objects;
CREATE POLICY "Authenticated update for storage buckets" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('properties', 'banners', 'projects', 'avatars'));

DROP POLICY IF EXISTS "Authenticated delete for storage buckets" ON storage.objects;
CREATE POLICY "Authenticated delete for storage buckets" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('properties', 'banners', 'projects', 'avatars'));

-- ==============================================================================
-- SECTION 8: SEED DATA & POSTGREST CACHE RELOAD
-- ==============================================================================

-- Seed default layout row if missing
INSERT INTO public.homepage_layouts (id, sections, updated_at)
VALUES ('default', '[]'::jsonb, timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
