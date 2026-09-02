-- Add 7-day restriction column to whatsapp_contacts
alter table public.whatsapp_contacts
  add column if not exists restriction_until timestamptz;

create index if not exists whatsapp_contacts_restriction_idx
  on public.whatsapp_contacts(phone, restriction_until);
