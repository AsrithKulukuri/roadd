-- Admin-curated homepage listing shelves. One atomic row holds the ordered layout.
create table if not exists public.homepage_layouts (
  id text primary key default 'default',
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.homepage_layouts enable row level security;

drop policy if exists "Public can read homepage layouts" on public.homepage_layouts;
create policy "Public can read homepage layouts"
on public.homepage_layouts for select
to public
using (true);

-- Writes are performed by the server API with the service-role client after admin validation.
