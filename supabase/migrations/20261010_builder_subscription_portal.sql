-- ==============================================================================
-- ROAD FACING — BUILDER SUBSCRIPTION & RAZORPAY BILLING SCHEMA
-- Migration: 20261010_builder_subscription_portal.sql
-- ==============================================================================

-- 1. Ensure Columns on builder_profiles
ALTER TABLE public.builder_profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expiring_soon', 'expired', 'pending_payment')),
  ADD COLUMN IF NOT EXISTS subscription_plan_months INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS subscription_price_per_month INTEGER DEFAULT 3500,
  ADD COLUMN IF NOT EXISTS last_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_order_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_reminded_at TIMESTAMPTZ;

-- 2. Builder Payments Table (Razorpay Transactions & Invoices)
CREATE TABLE IF NOT EXISTS public.builder_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID REFERENCES public.builder_profiles(id) ON DELETE CASCADE,
  builder_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  duration_months INTEGER NOT NULL DEFAULT 1,
  duration_days INTEGER NOT NULL DEFAULT 30,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('created', 'completed', 'failed', 'refunded')),
  invoice_number TEXT,
  billing_details JSONB DEFAULT '{}'::jsonb,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_builder_payments_builder_id ON public.builder_payments(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_payments_payment_id ON public.builder_payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_builder_payments_invoice ON public.builder_payments(invoice_number);

-- 3. RLS Policies
ALTER TABLE public.builder_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to builder payments" ON public.builder_payments;
CREATE POLICY "Admins have full access to builder payments" ON public.builder_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
