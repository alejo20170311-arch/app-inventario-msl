-- Configura un bucket público para fotos de perfil.
-- Ejecutar una vez en Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars lectura publica" on storage.objects;
create policy "avatars lectura publica"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "avatars usuario escribe propio" on storage.objects;
create policy "avatars usuario escribe propio"
on storage.objects
for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars usuario actualiza propio" on storage.objects;
create policy "avatars usuario actualiza propio"
on storage.objects
for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
