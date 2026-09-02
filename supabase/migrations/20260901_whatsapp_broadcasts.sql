-- ROAD WhatsApp broadcast audience, campaigns, recipients, and queue claiming.
-- Apply this migration before opening /admin/broadcasts.

create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id text,
  name text not null,
  phone text not null unique,
  source_type text not null default 'external'
    check (source_type in ('registered', 'external')),
  consent_source text not null,
  consent_evidence text,
  is_subscribed boolean not null default true,
  opted_in_at timestamptz not null default now(),
  opted_out_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists whatsapp_contacts_profile_id_unique
  on public.whatsapp_contacts(profile_id)
  where profile_id is not null;
create index if not exists whatsapp_contacts_subscription_idx
  on public.whatsapp_contacts(is_subscribed, opted_out_at);

create table if not exists public.whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message text not null,
  media_url text,
  media_kind text not null default 'none'
    check (media_kind in ('none', 'image')),
  content_type text not null default 'custom'
    check (content_type in ('custom', 'property', 'project', 'banner')),
  content_id text,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'completed', 'completed_with_failures', 'cancelled')),
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by text not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists whatsapp_campaigns_created_at_idx
  on public.whatsapp_campaigns(created_at desc);

create table if not exists public.whatsapp_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.whatsapp_campaigns(id) on delete cascade,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete restrict,
  name text not null,
  phone text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 0,
  provider_message_id text,
  last_error text,
  claimed_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(campaign_id, phone)
);

create index if not exists whatsapp_recipients_queue_idx
  on public.whatsapp_campaign_recipients(status, next_attempt_at, created_at);
create index if not exists whatsapp_recipients_campaign_idx
  on public.whatsapp_campaign_recipients(campaign_id, status);

alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_campaigns enable row level security;
alter table public.whatsapp_campaign_recipients enable row level security;

-- No browser-facing policies are created. Server routes use the service role and
-- enforce the database-backed admin session before every administrative action.

create or replace function public.claim_next_whatsapp_recipient(p_campaign_id uuid default null)
returns setof public.whatsapp_campaign_recipients
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
begin
  -- Recover recipients left in-flight by a terminated server request. Attempts
  -- below the retry ceiling become eligible again; exhausted rows stay failed.
  update public.whatsapp_campaign_recipients r
  set status = 'failed',
      last_error = 'Previous delivery attempt timed out before completion.',
      next_attempt_at = now()
  where r.status = 'sending'
    and r.claimed_at < now() - interval '10 minutes'
    and (p_campaign_id is null or r.campaign_id = p_campaign_id);

  select r.id into claimed_id
  from public.whatsapp_campaign_recipients r
  join public.whatsapp_campaigns c on c.id = r.campaign_id
  join public.whatsapp_contacts contact on contact.id = r.contact_id
  where (p_campaign_id is null or r.campaign_id = p_campaign_id)
    and c.status in ('queued', 'sending')
    and (
      r.status = 'queued'
      or (r.status = 'failed' and r.attempt_count < 3 and r.next_attempt_at <= now())
    )
    and contact.is_subscribed = true
    and contact.opted_out_at is null
  order by r.created_at asc
  for update of r skip locked
  limit 1;

  if claimed_id is null then
    return;
  end if;

  update public.whatsapp_campaign_recipients
  set status = 'sending',
      claimed_at = now(),
      attempt_count = attempt_count + 1
  where id = claimed_id;

  update public.whatsapp_campaigns
  set status = 'sending',
      started_at = coalesce(started_at, now())
  where id = (select campaign_id from public.whatsapp_campaign_recipients where id = claimed_id)
    and status = 'queued';

  return query
  select * from public.whatsapp_campaign_recipients where id = claimed_id;
end;
$$;

revoke all on function public.claim_next_whatsapp_recipient(uuid) from public;
grant execute on function public.claim_next_whatsapp_recipient(uuid) to service_role;

comment on table public.whatsapp_contacts is
  'Consent ledger for registered and external WhatsApp broadcast recipients.';
comment on table public.whatsapp_campaigns is
  'Admin-created, paced WhatsApp broadcast campaigns.';
