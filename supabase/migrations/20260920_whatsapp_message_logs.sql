-- Run before deploying WhatsApp Logs. Access is exclusively through admin APIs.
create table if not exists public.whatsapp_message_logs (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  recipient_type text not null default 'user',
  message_type text not null,
  message_body text not null,
  media_url text,
  template_name text,
  request_id text,
  provider text not null,
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued','accepted','sent','delivered','read','failed','simulated')),
  error_message text,
  error_category text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_logs_created_idx on public.whatsapp_message_logs(created_at desc);
create index if not exists whatsapp_logs_phone_idx on public.whatsapp_message_logs(phone);
create index if not exists whatsapp_logs_status_idx on public.whatsapp_message_logs(status, created_at desc);
create index if not exists whatsapp_logs_provider_idx on public.whatsapp_message_logs(provider, provider_message_id);

-- Store receipts even when the webhook arrives before the send response.
create table if not exists public.whatsapp_message_receipts (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_message_id text not null,
  status text not null check (status in ('sent','delivered','read','failed')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  error_message text,
  unique(provider, provider_message_id, status, occurred_at)
);
alter table public.whatsapp_message_logs enable row level security;
alter table public.whatsapp_message_receipts enable row level security;
revoke all on public.whatsapp_message_logs, public.whatsapp_message_receipts from anon, authenticated;
grant all on public.whatsapp_message_logs, public.whatsapp_message_receipts to service_role;
grant usage, select on sequence public.whatsapp_message_receipts_id_seq to service_role;

create or replace function public.sync_whatsapp_log_receipts(p_provider text, p_message_id text)
returns void language plpgsql set search_path = public as $$
begin
  update whatsapp_message_logs l set
    sent_at = coalesce(l.sent_at, r.sent_at),
    delivered_at = coalesce(l.delivered_at, r.delivered_at),
    read_at = coalesce(l.read_at, r.read_at),
    failed_at = coalesce(l.failed_at, r.failed_at),
    status = case when r.read_at is not null then 'read'
      when r.delivered_at is not null then 'delivered'
      when r.failed_at is not null then 'failed'
      when r.sent_at is not null then 'sent' else l.status end,
    error_message = coalesce(r.error_message, l.error_message),
    updated_at = now()
  from (
    select min(occurred_at) filter(where status='sent') sent_at,
      min(occurred_at) filter(where status='delivered') delivered_at,
      min(occurred_at) filter(where status='read') read_at,
      min(occurred_at) filter(where status='failed') failed_at,
      max(error_message) filter(where status='failed') error_message
    from whatsapp_message_receipts
    where provider=p_provider and provider_message_id=p_message_id
  ) r where l.provider=p_provider and l.provider_message_id=p_message_id;
end;
$$;

create or replace function public.record_whatsapp_receipt(
  p_provider text, p_message_id text, p_status text, p_occurred_at timestamptz, p_error text default null
) returns void language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_provider || ':' || p_message_id, 0));
  insert into whatsapp_message_receipts(provider,provider_message_id,status,occurred_at,error_message)
  values(p_provider,p_message_id,p_status,p_occurred_at,p_error) on conflict do nothing;
  perform sync_whatsapp_log_receipts(p_provider,p_message_id);
end;
$$;

create or replace function public.finish_whatsapp_log(
  p_id uuid, p_provider text, p_message_id text, p_status text,
  p_error text default null, p_error_category text default null
) returns void language plpgsql set search_path = public as $$
begin
  if p_message_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_provider || ':' || p_message_id, 0));
  end if;
  update whatsapp_message_logs set provider=p_provider, provider_message_id=p_message_id,
    status=p_status, error_message=p_error, error_category=p_error_category,
    accepted_at=case when p_status='accepted' then now() else null end,
    failed_at=case when p_status='failed' then now() else null end, updated_at=now()
  where id=p_id;
  if p_message_id is not null then perform sync_whatsapp_log_receipts(p_provider,p_message_id); end if;
end;
$$;
revoke all on function public.sync_whatsapp_log_receipts(text,text) from public, anon, authenticated;
revoke all on function public.record_whatsapp_receipt(text,text,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.finish_whatsapp_log(uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.sync_whatsapp_log_receipts(text,text) to service_role;
grant execute on function public.record_whatsapp_receipt(text,text,text,timestamptz,text) to service_role;
grant execute on function public.finish_whatsapp_log(uuid,text,text,text,text,text) to service_role;
