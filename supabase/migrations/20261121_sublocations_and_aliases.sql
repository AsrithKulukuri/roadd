-- ============================================================================
-- Migration: 20261121_sublocations_and_aliases.sql
-- Master Sublocations and Aliases for Pin-Accurate Google Maps Resolution
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sublocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_sublocations_city_slug UNIQUE (city_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_sublocations_city ON public.sublocations(city_id);
CREATE INDEX IF NOT EXISTS idx_sublocations_name ON public.sublocations(name);
CREATE INDEX IF NOT EXISTS idx_sublocations_coords ON public.sublocations(lat, lng);

CREATE TABLE IF NOT EXISTS public.sublocation_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id TEXT NOT NULL,
  sublocation_id UUID NOT NULL REFERENCES public.sublocations(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_normalized TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('admin', 'auto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_sublocation_aliases_city_alias UNIQUE (city_id, alias_normalized)
);

CREATE INDEX IF NOT EXISTS idx_sublocation_aliases_lookup ON public.sublocation_aliases(city_id, alias_normalized);
CREATE INDEX IF NOT EXISTS idx_sublocation_aliases_sublocation ON public.sublocation_aliases(sublocation_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sublocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sublocation_aliases ENABLE ROW LEVEL SECURITY;

-- Sublocations RLS: Public read, Admin-only write
DROP POLICY IF EXISTS "Public can view active sublocations" ON public.sublocations;
CREATE POLICY "Public can view active sublocations"
ON public.sublocations FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins can manage sublocations" ON public.sublocations;
CREATE POLICY "Admins can manage sublocations"
ON public.sublocations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Sublocation Aliases RLS: Admin-only for all operations
DROP POLICY IF EXISTS "Admins can manage sublocation aliases" ON public.sublocation_aliases;
CREATE POLICY "Admins can manage sublocation aliases"
ON public.sublocation_aliases FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_sublocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sublocations_updated_at ON public.sublocations;
CREATE TRIGGER tr_sublocations_updated_at
  BEFORE UPDATE ON public.sublocations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sublocations_updated_at();

-- Seed Initial Master Sublocations for Vijayawada and Guntur
INSERT INTO public.sublocations (city_id, name, slug, lat, lng) VALUES
  ('vijayawada', 'Benz Circle', 'benz-circle', 16.5062, 80.6480),
  ('vijayawada', 'Patamata', 'patamata', 16.4890, 80.6601),
  ('vijayawada', 'Moghalrajpuram', 'moghalrajpuram', 16.5020, 80.6380),
  ('vijayawada', 'Labbipet', 'labbipet', 16.5085, 80.6325),
  ('vijayawada', 'Poranki', 'poranki', 16.4780, 80.6950),
  ('vijayawada', 'Kanuru', 'kanuru', 16.5350, 80.6820),
  ('vijayawada', 'Penamaluru', 'penamaluru', 16.4630, 80.7120),
  ('vijayawada', 'Tadepalli', 'tadepalli', 16.4820, 80.5950),
  ('vijayawada', 'Mangalagiri', 'mangalagiri', 16.4420, 80.5650),
  ('vijayawada', 'Enikepadu', 'enikepadu', 16.5210, 80.7020),
  ('vijayawada', 'Ramavarappadu', 'ramavarappadu', 16.5260, 80.6720),
  ('vijayawada', 'Nidamanuru', 'nidamanuru', 16.5340, 80.7310),
  ('vijayawada', 'Gunadala', 'gunadala', 16.5320, 80.6550),
  ('vijayawada', 'Auto Nagar', 'auto-nagar', 16.5250, 80.5920),
  ('vijayawada', 'Bhavanipuram', 'bhavanipuram', 16.5300, 80.5950),
  ('vijayawada', 'Ibrahimpatnam', 'ibrahimpatnam', 16.5580, 80.5410),
  ('vijayawada', 'Edupugallu', 'edupugallu', 16.4641, 80.7549),
  ('vijayawada', 'Tadigadapa', 'tadigadapa', 16.4812, 80.6908),
  ('vijayawada', 'Gollapudi', 'gollapudi', 16.5492, 80.5925),
  ('vijayawada', 'Gannavaram', 'gannavaram', 16.5360, 80.8030),
  ('guntur', 'Brodipet', 'brodipet', 16.3008, 80.4428),
  ('guntur', 'Arundelpet', 'arundelpet', 16.3075, 80.4350),
  ('guntur', 'Lakshmipuram', 'lakshmipuram', 16.3120, 80.4280),
  ('guntur', 'Gorantla', 'gorantla', 16.3350, 80.4210),
  ('guntur', 'Amaravati Road', 'amaravati-road', 16.3280, 80.4050),
  ('guntur', 'Mangalagiri', 'mangalagiri-guntur', 16.4380, 80.5600),
  ('guntur', 'Nallapadu', 'nallapadu', 16.2750, 80.3950),
  ('guntur', 'Inner Ring Road', 'inner-ring-road', 16.3220, 80.4450),
  ('guntur', 'Autonagar', 'autonagar-guntur', 16.3150, 80.4620),
  ('guntur', 'Pattabhipuram', 'pattabhipuram', 16.2950, 80.4200),
  ('guntur', 'SVN Colony', 'svn-colony', 16.3020, 80.4100),
  ('guntur', 'Chandramouli Nagar', 'chandramouli-nagar', 16.3180, 80.4190),
  ('guntur', 'AT Agraharam', 'at-agraharam', 16.2980, 80.4500),
  ('guntur', 'Gujjanagundla', 'gujjanagundla', 16.2880, 80.4290),
  ('guntur', 'Koritapadu', 'koritapadu', 16.3060, 80.4220)
ON CONFLICT (city_id, slug) DO NOTHING;

