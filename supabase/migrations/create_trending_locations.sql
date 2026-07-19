-- Create trending_locations table
CREATE TABLE IF NOT EXISTS public.trending_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city TEXT NOT NULL,
    locality TEXT NOT NULL,
    image TEXT NOT NULL,
    properties_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.trending_locations ENABLE ROW LEVEL SECURITY;

-- Policies for trending_locations
-- 1. Allow public read access to everyone
CREATE POLICY "Enable read access for all users"
ON public.trending_locations
FOR SELECT
TO public
USING (true);

-- 2. Allow insert/update/delete for authenticated users (admins)
CREATE POLICY "Enable insert for authenticated users"
ON public.trending_locations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON public.trending_locations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON public.trending_locations
FOR DELETE
TO authenticated
USING (true);

-- Insert initial mock data if table is empty
INSERT INTO public.trending_locations (city, locality, image, properties_count)
SELECT 'Hyderabad', 'Jubilee Hills', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 124
WHERE NOT EXISTS (SELECT 1 FROM public.trending_locations);

INSERT INTO public.trending_locations (city, locality, image, properties_count)
SELECT 'Mumbai', 'Bandra West', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 86
WHERE NOT EXISTS (SELECT 1 FROM public.trending_locations);

INSERT INTO public.trending_locations (city, locality, image, properties_count)
SELECT 'Bangalore', 'Indiranagar', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 92
WHERE NOT EXISTS (SELECT 1 FROM public.trending_locations);
