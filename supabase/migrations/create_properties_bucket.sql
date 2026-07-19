-- Create a public bucket for storing property images
insert into storage.buckets (id, name, public)
values ('properties', 'properties', true)
on conflict (id) do nothing;

-- Allow public viewing of all property images
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'properties' );

-- Allow authenticated users to upload images (like the admin)
create policy "Authenticated users can upload"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'properties' );

-- Allow authenticated users to update their images
create policy "Authenticated users can update"
on storage.objects for update
to authenticated
using ( bucket_id = 'properties' );

-- Allow authenticated users to delete their images
create policy "Authenticated users can delete"
on storage.objects for delete
to authenticated
using ( bucket_id = 'properties' );
