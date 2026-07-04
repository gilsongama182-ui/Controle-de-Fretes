-- 014_cubagem.sql — papel "operador_log" + tabela de cubagem por volume

-- 1) Novo papel: operador_log (só acessa a tela de Inclusão de Cubagem, além do master)
alter table public.profiles drop constraint if exists profiles_profile_type_check;
alter table public.profiles add constraint profiles_profile_type_check
  check (profile_type in ('cliente', 'operador', 'master', 'operador_log'));

-- 2) operador_log também lê "deliveries" (busca por NF-e/Pedido/Destinatário pra
--    abrir o modal de cubagem) — mesma trilha de leitura já concedida a operador/master.
--    Não entra em insert/update/delete: esse papel não cria/edita/remove entregas.
drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select
  on public.deliveries
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and (
      public.current_profile_type() in ('operador', 'master', 'operador_log')
      or regexp_replace(coalesce(remetente_cnpj, ''), '\D', '', 'g') = (
        select regexp_replace(document, '\D', '', 'g')
        from public.profiles
        where id = auth.uid()
      )
    )
  );

-- 3) Tabela de volumes (1:N por entrega) — peso em kg, dimensões em cm.
create table if not exists public.delivery_volumes (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  ordem int not null default 1,
  peso numeric(10, 2) not null default 0,        -- kg
  altura numeric(10, 2) not null default 0,      -- cm
  largura numeric(10, 2) not null default 0,     -- cm
  comprimento numeric(10, 2) not null default 0, -- cm
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delivery_volumes_delivery_id_idx on public.delivery_volumes (delivery_id);

drop trigger if exists delivery_volumes_set_updated_at on public.delivery_volumes;
create trigger delivery_volumes_set_updated_at
  before update on public.delivery_volumes
  for each row execute function public.set_updated_at();

alter table public.delivery_volumes enable row level security;

-- SELECT: operador/master (relatório de exportação) e operador_log (tela de cubagem)
drop policy if exists delivery_volumes_select on public.delivery_volumes;
create policy delivery_volumes_select
  on public.delivery_volumes
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master', 'operador_log')
  );

-- INSERT/UPDATE/DELETE: só operador_log e master (operador comum não edita cubagem)
drop policy if exists delivery_volumes_insert on public.delivery_volumes;
create policy delivery_volumes_insert
  on public.delivery_volumes
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador_log', 'master')
  );

drop policy if exists delivery_volumes_update on public.delivery_volumes;
create policy delivery_volumes_update
  on public.delivery_volumes
  for update
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador_log', 'master')
  );

drop policy if exists delivery_volumes_delete on public.delivery_volumes;
create policy delivery_volumes_delete
  on public.delivery_volumes
  for delete
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador_log', 'master')
  );
