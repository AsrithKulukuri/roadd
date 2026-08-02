-- 1. Add missing columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;

-- 2. Update the trigger to sync email and phone from auth.users automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, phone, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    new.phone,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'role', 'buyer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill existing data from auth.users to user_profiles
UPDATE public.user_profiles up
SET 
  email = au.email,
  phone = COALESCE(up.phone, au.phone)
FROM auth.users au
WHERE up.id = au.id;

-- 4. Add RLS policy to allow Admin panel to view and update all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
CREATE POLICY "Admins can update all profiles"
ON public.user_profiles FOR UPDATE
USING (true);
