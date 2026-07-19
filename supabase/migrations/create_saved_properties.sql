-- Create saved_properties table
CREATE TABLE IF NOT EXISTS public.saved_properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    property_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, property_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

-- Policies for saved_properties
-- 1. Users can view their own saved properties
CREATE POLICY "Users can view their own saved properties"
ON public.saved_properties
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Users can insert their own saved properties
CREATE POLICY "Users can insert their own saved properties"
ON public.saved_properties
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Users can delete their own saved properties
CREATE POLICY "Users can delete their own saved properties"
ON public.saved_properties
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
