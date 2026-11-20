-- Migration: Ensure whatsapp_inbound_idempotency table exists with primary key unique constraint on wamid
-- Used by ROADFACING WhatsApp Webhook pipeline for persistent deduplication across serverless instances.

create table if not exists public.whatsapp_inbound_idempotency (
  provider_message_id text primary key,
  phone text not null,
  processed_at timestamptz not null default now()
);

-- Index for efficient cleanup queries based on retention window
create index if not exists idx_inbound_idemp_time 
  on public.whatsapp_inbound_idempotency(processed_at desc);

-- Retention & Cleanup Policy:
-- Meta WhatsApp Cloud API retries webhooks for a maximum of 24-48 hours.
-- Records older than 14 days can be safely purged periodically:
-- DELETE FROM public.whatsapp_inbound_idempotency WHERE processed_at < NOW() - INTERVAL '14 days';

