-- Migration: whatsapp_phone_rate_limits
-- Persistent distributed rate limiting per phone number across serverless instances.

create table if not exists public.whatsapp_phone_rate_limits (
  phone text primary key,
  window_start timestamptz not null default now(),
  request_count int not null default 1,
  blocked_until timestamptz
);

create index if not exists idx_phone_rate_limits_window
  on public.whatsapp_phone_rate_limits(window_start desc);

