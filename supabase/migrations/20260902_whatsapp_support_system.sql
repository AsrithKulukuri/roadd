-- ROAD WhatsApp AI Support System, Conversations Log & Support Ticketing

-- 1. Conversation message logs
create table if not exists public.whatsapp_support_conversations (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  user_id text,
  user_name text,
  role text not null check (role in ('user', 'assistant', 'agent', 'system')),
  message text not null,
  media_url text,
  intent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_conv_phone_idx
  on public.whatsapp_support_conversations(phone, created_at desc);

-- 2. Support Tickets for Human Escalation & Inquiries
create table if not exists public.whatsapp_support_tickets (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  user_name text,
  user_id text,
  subject text not null,
  last_message text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to text,
  assigned_name text,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists whatsapp_tickets_phone_idx
  on public.whatsapp_support_tickets(phone);
create index if not exists whatsapp_tickets_status_idx
  on public.whatsapp_support_tickets(status, created_at desc);
