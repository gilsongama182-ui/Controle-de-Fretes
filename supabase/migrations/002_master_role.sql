-- Hemmersbach Logistics — adiciona o papel "master" (administrador)
-- Rode no SQL Editor do painel Supabase (depois de schema.sql já aplicado).

-- 1) Permite 'master' como profile_type
alter table public.profiles drop constraint if exists profiles_profile_type_check;
alter table public.profiles add constraint profiles_profile_type_check
  check (profile_type in ('cliente', 'operador', 'master'));

-- 2) master enxerga e administra todos os perfis (tela de Usuários)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  using (id = auth.uid() or public.current_profile_type() = 'master');

drop policy if exists profiles_update_master on public.profiles;
create policy profiles_update_master
  on public.profiles
  for update
  using (public.current_profile_type() = 'master');

-- 3) master tem os mesmos poderes de operador sobre entregas
drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select
  on public.deliveries
  for select
  using (
    public.current_profile_type() in ('operador', 'master')
    or regexp_replace(cnpj_cpf, '\D', '', 'g') = (
      select regexp_replace(document, '\D', '', 'g')
      from public.profiles
      where id = auth.uid()
    )
  );

drop policy if exists deliveries_insert on public.deliveries;
create policy deliveries_insert
  on public.deliveries
  for insert
  with check (public.current_profile_type() in ('operador', 'master'));

drop policy if exists deliveries_update on public.deliveries;
create policy deliveries_update
  on public.deliveries
  for update
  using (public.current_profile_type() in ('operador', 'master'));

drop policy if exists deliveries_delete on public.deliveries;
create policy deliveries_delete
  on public.deliveries
  for delete
  using (public.current_profile_type() in ('operador', 'master'));

-- 4) Depois de rodar o script acima, promova sua conta a master
--    (troque o e-mail pelo que você já usa para logar no app):
-- update public.profiles set profile_type = 'master' where email = 'seu-email@exemplo.com';
