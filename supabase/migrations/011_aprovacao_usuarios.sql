-- Aprovação de novos usuários pelo master + trava de acesso enquanto pendente.
-- Rode este script inteiro no SQL Editor do painel Supabase.

alter table public.profiles
  add column if not exists status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'rejeitado'));

-- Quem já estava cadastrado antes desta migration continua com acesso liberado.
-- Só cadastros feitos a partir de agora nascem "pendente" (valor padrão da coluna).
update public.profiles set status = 'aprovado' where status = 'pendente';

create or replace function public.current_profile_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select status from public.profiles where id = auth.uid();
$$;

-- deliveries: além do papel, agora também exige status = 'aprovado'.
drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select
  on public.deliveries
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and (
      public.current_profile_type() in ('operador', 'master')
      or regexp_replace(coalesce(remetente_cnpj, ''), '\D', '', 'g') = (
        select regexp_replace(document, '\D', '', 'g')
        from public.profiles
        where id = auth.uid()
      )
    )
  );

drop policy if exists deliveries_insert on public.deliveries;
create policy deliveries_insert
  on public.deliveries
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists deliveries_update on public.deliveries;
create policy deliveries_update
  on public.deliveries
  for update
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists deliveries_delete on public.deliveries;
create policy deliveries_delete
  on public.deliveries
  for delete
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

-- storage (comprovantes de entrega): mesma trava de aprovação.
drop policy if exists comprovantes_insert on storage.objects;
create policy comprovantes_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'comprovantes'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists comprovantes_select on storage.objects;
create policy comprovantes_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists comprovantes_update on storage.objects;
create policy comprovantes_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  )
  with check (
    bucket_id = 'comprovantes'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists comprovantes_delete on storage.objects;
create policy comprovantes_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );
