-- Migration: whatsapp_phone_processing_locks
-- Lock-row table (phone, locked_until, owner) for cross-instance message serialization.
-- Prevents race conditions and out-of-order WhatsApp replies across pooled PostgREST connections.

create table if not exists public.whatsapp_phone_processing_locks (
  phone text primary key,
  locked_until timestamptz not null,
  owner text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_phone_locks_locked_until 
  on public.whatsapp_phone_processing_locks(locked_until);

comment on table public.whatsapp_phone_processing_locks is 'Per-phone distributed locks with TTL to ensure strict in-order message delivery';
