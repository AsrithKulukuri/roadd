-- Preserve OTP request history so phone and network limits cannot be bypassed.

alter table public.phone_otps
  add column if not exists request_ip_hash text,
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists verified_at timestamptz;

create index if not exists phone_otps_ip_created_idx
  on public.phone_otps(request_ip_hash, created_at desc);
create index if not exists phone_otps_phone_created_idx
  on public.phone_otps(phone, created_at desc);

-- Keep only the newest unverified challenge active before enforcing uniqueness.
with ranked_active_otps as (
  select
    id,
    row_number() over (partition by phone order by created_at desc, id desc) as position
  from public.phone_otps
  where verified = false
)
update public.phone_otps
set verified = true,
    verified_at = coalesce(verified_at, now()),
    delivery_status = 'superseded'
where id in (
  select id
  from ranked_active_otps
  where position > 1
);

create unique index if not exists phone_otps_one_active_per_phone
  on public.phone_otps(phone)
  where verified = false;

create or replace function public.cleanup_expired_phone_otps()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.phone_otps
  set verified = true,
      verified_at = coalesce(verified_at, now()),
      delivery_status = case when delivery_status = 'pending' then 'expired' else delivery_status end
  where verified = false and expires_at < now();

  delete from public.phone_otps
  where created_at < now() - interval '24 hours';
end;
$$;

revoke all on function public.cleanup_expired_phone_otps() from public;
grant execute on function public.cleanup_expired_phone_otps() to service_role;

create or replace function public.record_failed_phone_otp_attempt(
  p_otp_id uuid,
  p_max_attempts integer default 5
)
returns table(attempts integer, locked boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.phone_otps as otp
  set attempts = otp.attempts + 1,
      verified = case when otp.attempts + 1 >= greatest(p_max_attempts, 1) then true else otp.verified end,
      verified_at = case
        when otp.attempts + 1 >= greatest(p_max_attempts, 1) then coalesce(otp.verified_at, now())
        else otp.verified_at
      end,
      delivery_status = case
        when otp.attempts + 1 >= greatest(p_max_attempts, 1) then 'locked'
        else otp.delivery_status
      end
  where otp.id = p_otp_id
    and otp.verified = false
  returning otp.attempts, otp.verified;
end;
$$;

revoke all on function public.record_failed_phone_otp_attempt(uuid, integer) from public;
grant execute on function public.record_failed_phone_otp_attempt(uuid, integer) to service_role;
