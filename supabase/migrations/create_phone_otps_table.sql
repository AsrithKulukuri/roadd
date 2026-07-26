-- ====================================================================
-- MIGRATION: WhatsApp OTP Authentication System for ROAD
-- Table: phone_otps
-- Description: Stores SHA-256 hashed OTPs for WhatsApp authentication
-- ====================================================================

-- 1. Create phone_otps table
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Indexes for High Performance Lookup & Expiry Sweeps
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON public.phone_otps(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires_at ON public.phone_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_otps_created_at ON public.phone_otps(created_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Restrict access entirely to Service Role Key (Backend Only)
-- Deny public anonymous/authenticated read/write to prevent client-side tampering.
CREATE POLICY "No public access to phone_otps" 
  ON public.phone_otps 
  FOR ALL 
  USING (false);

-- 5. Helper Function to Clean Up Expired and Verified OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_phone_otps()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.phone_otps 
  WHERE expires_at < NOW() OR verified = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. (Optional) Comment describing table structure
COMMENT ON TABLE public.phone_otps IS 'Stores SHA-256 hashed WhatsApp OTPs for ROAD authentication with rate limiting and automated expiry cleanup.';
