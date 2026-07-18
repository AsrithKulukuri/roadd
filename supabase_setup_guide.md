# Supabase & Google OAuth Setup Guide

Follow this guide to configure your Supabase project, set up the Google OAuth credentials, and initialize your database schema with sync triggers.

---

## 1. Environment Keys (.env.local)

Create or update the [.env.local](file:///c:/Users/asrit/Aasrith_works/road/.env.local) file in your project root with the following keys:

```env
# Get these from Supabase Dashboard -> Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

---

## 2. Google OAuth Configuration

To support Google Sign-In, you need to configure credentials in both the Google Cloud Console and your Supabase Dashboard:

### Step A: Google Cloud Console Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `Road Facing`).
3. Go to **APIs & Services** -> **OAuth consent screen**:
   - Choose **External** user type.
   - Fill in the required fields (App name, support email, developer contact).
4. Go to **APIs & Services** -> **Credentials**:
   - Click **+ Create Credentials** -> **OAuth client ID**.
   - Select **Web application** as the Application type.
   - **Authorized JavaScript origins**: Add `https://your-project-id.supabase.co` (copy this URL from your Supabase API settings).
   - **Authorized redirect URIs**: Add your Supabase OAuth callback URL:
     `https://your-project-id.supabase.co/auth/v1/callback`
   - Click **Create** and copy the resulting **Client ID** and **Client Secret**.

### Step B: Supabase Dashboard Setup
1. Open your project on the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** -> **Providers** -> **Google**:
   - Enable the Google provider.
   - Paste the **Client ID** and **Client Secret** you obtained in Step A.
   - Click **Save**.
3. Go to **Authentication** -> **URL Configuration**:
   - **Site URL**: Add `http://localhost:3000` (or your production domain).
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback` to the list of allowed redirects.

---

## 3. Database Schema & Sync Triggers

Open the **SQL Editor** in your Supabase Dashboard, create a new query, paste the script below, and click **Run**. 

This script:
1. Creates a public `profiles` table to store public user profiles.
2. Sets up **Row Level Security (RLS)** so users can only modify their own profiles.
3. Creates a **Postgres Trigger Function** that automatically generates a public profile record when a user signs up (via Google OAuth, Email, or Phone).
4. Creates a trigger that automatically updates the profile name/phone when updated via the dashboard.

```sql
-- 1. Create a table for public profiles linked to auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  phone text,
  full_name text,
  role text default 'buyer' check (role in ('buyer', 'owner', 'agent', 'developer', 'admin')),
  avatar_url text,
  is_verified boolean default false,
  is_profile_complete boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Create security policies (RLS rules)
-- Allow anyone to view profiles (needed to display agent details, owner listings, etc.)
create policy "Allow public read access" 
  on public.profiles for select 
  using (true);

-- Allow authenticated users to update their own profiles
create policy "Allow users to update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Allow admins to update any user profile (required for admin verification approvals)
create policy "Allow admins to update any profile"
  on public.profiles for update
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 4. Create Postgres trigger function to sync new user sign-ups automatically
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
language plpgsql as $$
begin
  insert into public.profiles (
    id,
    email,
    phone,
    full_name,
    role,
    avatar_url,
    is_profile_complete
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.phone, new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'buyer'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    case 
      when (new.phone is not null or new.raw_user_meta_data->>'phone' is not null) 
           and new.raw_user_meta_data->>'role' is not null then true
      else false
    end
  );
  return new;
end;
$$;

-- Trigger to run the function when a new user registers in auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Create trigger function to sync profile updates back from auth.users (metadata updates)
create or replace function public.handle_update_user()
returns trigger
security definer set search_path = public
language plpgsql as $$
begin
  update public.profiles
  set
    phone = coalesce(new.phone, new.raw_user_meta_data->>'phone', phone),
    full_name = coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', full_name),
    role = coalesce(new.raw_user_meta_data->>'role', role),
    is_profile_complete = coalesce((new.raw_user_meta_data->>'isProfileComplete')::boolean, is_profile_complete),
    updated_at = timezone('utc'::text, now())
  where id = new.id;
  return new;
end;
$$;

-- Trigger to run the sync function when a user metadata changes in auth.users
create or replace trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_update_user();
```
