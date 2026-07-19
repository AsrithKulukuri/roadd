-- ============================================================
-- Production RLS Policies for properties table
-- Run this AFTER create_properties_table.sql
-- ============================================================

-- Drop existing overly-permissive update/delete policies
drop policy if exists "Authenticated users can update properties" on public.properties;
drop policy if exists "Authenticated users can delete properties" on public.properties;

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

-- ============================================================
-- saved_properties table
-- ============================================================
create table if not exists public.saved_properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  property_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, property_id)
);

alter table public.saved_properties enable row level security;

-- Users can only see their own saved properties
create policy "Users can view their own saved properties"
on public.saved_properties for select
to authenticated
using (auth.uid() = user_id);

-- Users can save properties
create policy "Users can save properties"
on public.saved_properties for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can unsave properties
create policy "Users can unsave properties"
on public.saved_properties for delete
to authenticated
using (auth.uid() = user_id);

-- ============================================================
-- user_profiles table (for extended user data)
-- ============================================================
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

-- Trigger to auto-create user profile on signup
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
