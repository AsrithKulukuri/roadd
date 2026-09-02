-- ROAD Facing AI Enterprise Database Schema
-- Conversation State, CRM Leads, Site Visits, Saved Properties & Idempotency Logs

-- 1. Webhook Message Deduplication / Idempotency
create table if not exists public.whatsapp_inbound_idempotency (
  provider_message_id text primary key,
  phone text not null,
  processed_at timestamptz not null default now()
);
create index if not exists idx_inbound_idemp_time on public.whatsapp_inbound_idempotency(processed_at desc);

-- 2. Stateful Conversation Sessions
create table if not exists public.whatsapp_conversation_state (
  phone text primary key,
  user_id text,
  user_name text,
  current_intent text default 'GREETING',
  last_search jsonb default '{}'::jsonb,
  selected_property_id text,
  agent_mode boolean not null default false,
  active_ticket_id text,
  lead_id text,
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. CRM Leads & Sales Pipeline
create table if not exists public.whatsapp_leads (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  user_name text,
  user_id text,
  purpose text check (purpose in ('SELF_USE', 'INVESTMENT', 'COMMERCIAL', 'RENTAL', 'OTHER')),
  budget_range text,
  timeline text check (timeline in ('IMMEDIATE', '1_3_MONTHS', '3_6_MONTHS', 'EXPLORING')),
  stage text not null default 'NEW' check (stage in ('NEW', 'EXPLORING', 'INTERESTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'CUSTOMER', 'LOST')),
  lead_score int not null default 10,
  interested_project_id text,
  interested_project_name text,
  notes text,
  assigned_agent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_whatsapp_leads_phone on public.whatsapp_leads(phone);
create index if not exists idx_whatsapp_leads_score on public.whatsapp_leads(lead_score desc, created_at desc);

-- 4. Site Visit Requests
create table if not exists public.whatsapp_site_visits (
  id uuid primary key default gen_random_uuid(),
  lead_id text,
  phone text not null,
  user_name text,
  property_or_project_id text not null,
  property_title text not null,
  preferred_date date,
  preferred_time_slot text check (preferred_time_slot in ('MORNING', 'AFTERNOON', 'EVENING')),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'PENDING', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED')),
  assigned_advisor text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_site_visits_phone on public.whatsapp_site_visits(phone, status);

-- 5. Saved Properties per WhatsApp User
create table if not exists public.whatsapp_saved_properties (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  property_or_project_id text not null,
  item_type text not null default 'property' check (item_type in ('property', 'project')),
  title text not null,
  location_text text,
  price_text text,
  created_at timestamptz not null default now()
);
create index if not exists idx_saved_props_phone on public.whatsapp_saved_properties(phone);
