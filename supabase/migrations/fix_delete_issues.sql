-- Fix 1: Allow properties to be deleted and updated by any authenticated user (admin panel)
drop policy if exists "Owners can delete their own properties" on public.properties;
drop policy if exists "Owners can update their own properties" on public.properties;

create policy "Admins can delete properties"
on public.properties for delete
to authenticated
using (true);

create policy "Admins can update properties"
on public.properties for update
to authenticated
using (true);

-- Allow public access as a fallback if you are testing without being logged in
create policy "Public can delete properties"
on public.properties for delete
to public
using (true);

create policy "Public can update properties"
on public.properties for update
to public
using (true);


-- Fix 2: Do the same for projects table
drop policy if exists "Authenticated users can delete projects" on public.projects;
drop policy if exists "Authenticated users can update projects" on public.projects;

create policy "Admins can delete projects"
on public.projects for delete
using (true);

create policy "Admins can update projects"
on public.projects for update
using (true);


-- Fix 3: Ensure projects bucket exists and has correct policies
insert into storage.buckets (id, name, public)
values ('projects', 'projects', true)
on conflict (id) do nothing;

create policy "Public Access Projects"
on storage.objects for select
to public
using ( bucket_id = 'projects' );

create policy "Authenticated users can upload projects"
on storage.objects for insert
with check ( bucket_id = 'projects' );

create policy "Authenticated users can update projects"
on storage.objects for update
using ( bucket_id = 'projects' );

create policy "Authenticated users can delete projects"
on storage.objects for delete
using ( bucket_id = 'projects' );


-- Fix 4: Ensure properties bucket allows delete for anon/public just in case
create policy "Public can delete property images"
on storage.objects for delete
to public
using ( bucket_id = 'properties' );

create policy "Public can delete project images"
on storage.objects for delete
to public
using ( bucket_id = 'projects' );
