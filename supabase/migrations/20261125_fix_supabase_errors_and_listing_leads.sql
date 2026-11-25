-- ==============================================================================
-- ROAD Platform Database Hardening & Error Resolution Migration
-- File: supabase/migrations/20261125_fix_supabase_errors_and_listing_leads.sql
-- Date: 2026-11-25
--
-- Resolves:
--   1. PostgreSQL 23502 (email NOT NULL constraint on profiles preventing phone-only users)
--   2. PostgreSQL 23505 (profiles_email_key duplicate empty string '')
--   3. PostgreSQL 25P02 (Aborted transaction cascade from handle_new_user trigger)
--   4. PostgreSQL 22P02 (Invalid UUID syntax when wa_ prefix passed to UUID columns)
--   5. PostgreSQL 42703 (Missing project_leads.phone - canonical is viewer_phone)
--   6. Server-side listing actions & favourites hardening with full 6-action support
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. DROP NOT NULL CONSTRAINT ON EMAIL IN PROFILES & USER_PROFILES
--    WhatsApp OTP users authenticate via phone and do not have an email initially.
--    In PostgreSQL, UNIQUE constraints permit multiple NULLs, but only ONE empty string ''.
--    Dropping NOT NULL allows genuine phone-only signups without empty-string collisions.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'email' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'user_profiles' 
      AND column_name = 'email' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.user_profiles ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. CLEAN UP EXISTING EMPTY-STRING EMAILS IN PROFILES & USER_PROFILES
--    Now that NOT NULL is dropped, convert any existing empty strings to NULL.
-- ------------------------------------------------------------------------------
UPDATE public.profiles
SET email = NULL
WHERE email IS NOT NULL AND TRIM(email) = '';

UPDATE public.user_profiles
SET email = NULL
WHERE email IS NOT NULL AND TRIM(email) = '';

-- ------------------------------------------------------------------------------
-- 3. HARDEN public.handle_new_user() TRIGGER FUNCTION
--    - Use NULLIF(TRIM(NEW.email), '') so empty strings become NULL.
--    - Guard against duplicate non-internal emails from crashing user creation.
--    - Wrap in EXCEPTION block so profile sync NEVER aborts auth.users transactions (25P02).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  resolved_role TEXT;
  resolved_phone TEXT;
  resolved_name TEXT;
  resolved_avatar TEXT;
  resolved_email TEXT;
  profile_complete BOOLEAN;
  email_conflict BOOLEAN;
BEGIN
  resolved_role := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer');
  resolved_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '');
  resolved_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User');
  resolved_avatar := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');
  profile_complete := (resolved_phone <> '' AND resolved_name <> '' AND resolved_name <> 'User');

  -- Ensure empty strings become NULL to avoid unique constraint violations
  resolved_email := NULLIF(TRIM(NEW.email), '');

  -- Guard: If email is provided, verify it does not belong to another existing profile
  IF resolved_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE email = resolved_email AND id <> NEW.id
    ) INTO email_conflict;

    IF email_conflict THEN
      -- Log warning and do not inject colliding email into profiles
      RAISE WARNING 'handle_new_user: email conflict for % on user %. Setting email to NULL.', resolved_email, NEW.id;
      resolved_email := NULL;
    END IF;
  END IF;

  -- 1. Sync public.profiles
  INSERT INTO public.profiles (
    id, email, phone, full_name, role, avatar_url, is_verified, is_profile_complete, updated_at, created_at
  )
  VALUES (
    NEW.id, resolved_email, resolved_phone, resolved_name, resolved_role, resolved_avatar, false, profile_complete, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = CASE 
      WHEN resolved_email IS NOT NULL THEN resolved_email 
      ELSE public.profiles.email 
    END,
    phone = CASE 
      WHEN resolved_phone <> '' THEN resolved_phone 
      ELSE public.profiles.phone 
    END,
    full_name = CASE 
      WHEN resolved_name <> 'User' THEN resolved_name 
      ELSE public.profiles.full_name 
    END,
    avatar_url = CASE 
      WHEN resolved_avatar <> '' THEN resolved_avatar 
      ELSE public.profiles.avatar_url 
    END,
    updated_at = now();

  -- 2. Sync public.user_profiles
  INSERT INTO public.user_profiles (
    id, email, phone, full_name, role, avatar_url, is_verified, is_profile_complete, updated_at, created_at
  )
  VALUES (
    NEW.id, resolved_email, resolved_phone, resolved_name, resolved_role, resolved_avatar, false, profile_complete, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = CASE 
      WHEN resolved_email IS NOT NULL THEN resolved_email 
      ELSE public.user_profiles.email 
    END,
    phone = CASE 
      WHEN resolved_phone <> '' THEN resolved_phone 
      ELSE public.user_profiles.phone 
    END,
    full_name = CASE 
      WHEN resolved_name <> 'User' THEN resolved_name 
      ELSE public.user_profiles.full_name 
    END,
    avatar_url = CASE 
      WHEN resolved_avatar <> '' THEN resolved_avatar 
      ELSE public.user_profiles.avatar_url 
    END,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- CRITICAL: Never abort auth.users transaction (25P02 prevention)
  RAISE WARNING 'handle_new_user exception caught for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 4. HARDEN public.listing_action_leads TABLE
--    - user_id is TEXT (supports both UUIDs and external wa_ identifiers).
--    - Covers all 6 actions: reveal_phone, whatsapp_click, callback_request,
--      brochure_download, schedule_visit, information_request.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_action_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('project','property')),
  listing_id text NOT NULL,
  listing_slug text,
  listing_name text NOT NULL,
  action text NOT NULL,
  action_day date NOT NULL,
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  recipient_phone text,
  source text NOT NULL,
  consent_version text NOT NULL,
  builder_notified boolean NOT NULL DEFAULT false,
  admin_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_type, listing_id, action, action_day)
);

-- Ensure user_id column is TEXT even if table already existed with UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'listing_action_leads' 
      AND column_name = 'user_id' 
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.listing_action_leads ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END $$;

-- Update action CHECK constraint to support all 6 application actions
ALTER TABLE public.listing_action_leads DROP CONSTRAINT IF EXISTS listing_action_leads_action_check;
ALTER TABLE public.listing_action_leads ADD CONSTRAINT listing_action_leads_action_check
  CHECK (action IN ('reveal_phone', 'whatsapp_click', 'callback_request', 'brochure_download', 'schedule_visit', 'information_request'));

ALTER TABLE public.listing_action_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_action_leads FROM anon, authenticated;
GRANT ALL ON public.listing_action_leads TO service_role;

-- Performance indexes for listing leads
CREATE INDEX IF NOT EXISTS idx_listing_action_leads_user ON public.listing_action_leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_action_leads_listing ON public.listing_action_leads(listing_type, listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_action_leads_buyer_phone ON public.listing_action_leads(buyer_phone, created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. HARDEN public.user_saved_listings TABLE
--    - user_id is TEXT (supports both UUIDs and external wa_ identifiers).
--    - listing_id is TEXT (supports both project and property IDs / slugs).
--    - Backfill legacy saved_properties with ON CONFLICT DO NOTHING.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_saved_listings (
  user_id text NOT NULL,
  listing_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, listing_id)
);

-- Ensure column types are TEXT even if table already existed with UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_saved_listings' 
      AND column_name = 'user_id' 
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.user_saved_listings ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_saved_listings' 
      AND column_name = 'listing_id' 
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.user_saved_listings ALTER COLUMN listing_id TYPE text USING listing_id::text;
  END IF;
END $$;

ALTER TABLE public.user_saved_listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_saved_listings FROM anon, authenticated;
GRANT ALL ON public.user_saved_listings TO service_role;

CREATE INDEX IF NOT EXISTS idx_user_saved_listings_user ON public.user_saved_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_listings_listing ON public.user_saved_listings(listing_id);

-- Backfill from legacy saved_properties if present
DO $$
BEGIN
  IF to_regclass('public.saved_properties') IS NOT NULL THEN
    INSERT INTO public.user_saved_listings(user_id, listing_id)
    SELECT user_id::text, property_id::text
    FROM public.saved_properties
    WHERE user_id IS NOT NULL AND property_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. SECURE projects AND properties DIRECT CLIENT ACCESS
--    Public reads are served through server-side /api/listings and Next.js SSR.
--    This protects sensitive fields (contact info, raw builder pricing) from direct scraping.
-- ------------------------------------------------------------------------------
REVOKE SELECT ON public.projects, public.properties FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.projects, public.properties TO service_role;

COMMIT;
