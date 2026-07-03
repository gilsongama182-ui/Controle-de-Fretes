-- Comprovante de entrega (PNG/JPEG/PDF) anexado por operador/master.
-- Rode este script inteiro no SQL Editor do painel Supabase.

alter table public.deliveries
  add column if not exists comprovante_path text,
  add column if not exists comprovante_nome text;

-- Bucket privado: arquivos só são acessíveis via URL assinada (sem link público).
insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

drop policy if exists comprovantes_insert on storage.objects;
create policy comprovantes_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'comprovantes'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists comprovantes_select on storage.objects;
create policy comprovantes_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists comprovantes_update on storage.objects;
create policy comprovantes_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.current_profile_type() in ('operador', 'master')
  )
  with check (
    bucket_id = 'comprovantes'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists comprovantes_delete on storage.objects;
create policy comprovantes_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.current_profile_type() in ('operador', 'master')
  );
