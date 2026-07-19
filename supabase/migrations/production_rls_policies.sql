-- ============================================================
-- Production RLS Policies (idempotent — safe to re-run)
-- Run this AFTER create_properties_table.sql
-- ============================================================

-- ---- properties table ----------------------------------------
drop policy if exists "Authenticated users can update properties" on public.properties;
drop policy if exists "Authenticated users can delete properties" on public.properties;
drop policy if exists "Owners can update their own properties" on public.properties;
drop policy if exists "Owners can delete their own properties" on public.properties;

-- Only the owner can update their property
create policy "Owners can update their own properties"
on public.properties for update
to authenticated
using (auth.uid()::text = "ownerId");

-- Only the owner can delete their property
create policy "Owners can delete their own properties"
on public.properties for delete
to authenticated
using (auth.uid()::text = "ownerId");

-- ---- saved_properties table ----------------------------------
create table if not exists public.saved_properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  property_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, property_id)
);

alter table public.saved_properties enable row level security;

drop policy if exists "Users can view their own saved properties" on public.saved_properties;
drop policy if exists "Users can save properties" on public.saved_properties;
drop policy if exists "Users can unsave properties" on public.saved_properties;

create policy "Users can view their own saved properties"
on public.saved_properties for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can save properties"
on public.saved_properties for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can unsave properties"
on public.saved_properties for delete
to authenticated
using (auth.uid() = user_id);

-- ---- user_profiles table ------------------------------------
create table if not exists public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'buyer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile" on public.user_profiles;
drop policy if exists "Users can insert their own profile" on public.user_profiles;

create policy "Users can view their own profile"
on public.user_profiles for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.user_profiles for update
to authenticated
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.user_profiles for insert
to authenticated
with check (auth.uid() = id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'role', 'buyer')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

