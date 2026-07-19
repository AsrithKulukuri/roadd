create table if not exists public.properties (
    id text primary key,
    slug text unique not null,
    title text not null,
    description text,
    price bigint not null,
    "pricePerSqft" numeric,
    "propertyType" text not null,
    "listingType" text not null,
    status text not null default 'draft',
    bedrooms integer default 0,
    bathrooms integer default 0,
    balconies integer default 0,
    floors integer,
    "totalFloors" integer,
    "floorNumber" integer,
    parking integer default 0,
    "roadWidth" numeric,
    "undividedShare" numeric,
    area numeric,
    "carpetArea" numeric,
    "builtUpArea" numeric,
    furnishing text,
    facing text,
    "ageOfProperty" integer,
    "possessionDate" text,
    "isReadyToMove" boolean default true,
    location jsonb not null,
    images jsonb not null default '[]'::jsonb,
    "coverImage" text,
    "galleryImages" jsonb default '[]'::jsonb,
    "videoUrl" text,
    amenities jsonb default '[]'::jsonb,
    features jsonb default '[]'::jsonb,
    "reraId" text,
    "isVerified" boolean default false,
    "isFeatured" boolean default false,
    "isRecommended" boolean default false,
    "isPremium" boolean default false,
    "showOnMap" boolean default true,
    "ownerId" text not null,
    "ownerName" text,
    "ownerPhone" text not null,
    "ownerEmail" text,
    "ownerAvatar" text,
    "ownerType" text default 'owner',
    "isOwnerVerified" boolean default false,
    "viewCount" integer default 0,
    "savedCount" integer default 0,
    "enquiryCount" integer default 0,
    "createdAt" text not null,
    "updatedAt" text not null,
    "publishedAt" text,
    "vastuCompliant" boolean default false,
    "petFriendly" boolean default false,
    "gatedSecurity" boolean default false
);

-- Enable RLS
alter table public.properties enable row level security;

-- Policies
create policy "Properties are viewable by everyone" 
on public.properties for select 
using (true);

create policy "Authenticated users can insert properties" 
on public.properties for insert 
to authenticated 
with check (true);

create policy "Authenticated users can update properties" 
on public.properties for update
to authenticated 
using (true);

create policy "Authenticated users can delete properties" 
on public.properties for delete
to authenticated 
using (true);
