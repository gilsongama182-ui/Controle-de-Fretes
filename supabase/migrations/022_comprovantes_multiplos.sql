-- Permite múltiplos comprovantes por entrega (antes era 1 arquivo só,
-- em 2 colunas de texto na própria tabela deliveries).
-- Rode este script inteiro no SQL Editor do painel Supabase.

-- 1) Tabela filha (mesmo padrão de partner_documents, ver 015_parceiros.sql)
create table if not exists public.delivery_comprovantes (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  arquivo_path text not null,
  arquivo_nome text not null,
  created_at timestamptz not null default now()
);

create index if not exists delivery_comprovantes_delivery_id_idx on public.delivery_comprovantes (delivery_id);
alter table public.delivery_comprovantes enable row level security;

-- 2) Migra os comprovantes já existentes (1 por entrega) para a tabela nova
insert into public.delivery_comprovantes (delivery_id, arquivo_path, arquivo_nome, created_at)
select id, comprovante_path, comprovante_nome, updated_at
from public.deliveries
where comprovante_path is not null;

-- 3) Remove as colunas antigas de deliveries
alter table public.deliveries
  drop column if exists comprovante_path,
  drop column if exists comprovante_nome;

-- 4) RLS — operador/master têm CRUD completo
drop policy if exists delivery_comprovantes_select on public.delivery_comprovantes;
create policy delivery_comprovantes_select
  on public.delivery_comprovantes
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists delivery_comprovantes_insert on public.delivery_comprovantes;
create policy delivery_comprovantes_insert
  on public.delivery_comprovantes
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists delivery_comprovantes_delete on public.delivery_comprovantes;
create policy delivery_comprovantes_delete
  on public.delivery_comprovantes
  for delete
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

-- motorista só enxerga/anexa comprovantes de entregas atribuídas a ele, e só
-- insere (sem update/delete — a foto é enviada no momento da baixa, não é
-- substituída depois).
drop policy if exists delivery_comprovantes_select_motorista on public.delivery_comprovantes;
create policy delivery_comprovantes_select_motorista
  on public.delivery_comprovantes
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'motorista'
    and exists (
      select 1 from public.deliveries d
      where d.id = delivery_comprovantes.delivery_id
        and d.motorista_id = auth.uid()
    )
  );

drop policy if exists delivery_comprovantes_insert_motorista on public.delivery_comprovantes;
create policy delivery_comprovantes_insert_motorista
  on public.delivery_comprovantes
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'motorista'
    and exists (
      select 1 from public.deliveries d
      where d.id = delivery_comprovantes.delivery_id
        and d.motorista_id = auth.uid()
    )
  );

-- 5) RPC de baixa pelo motorista deixa de mexer em comprovante (agora é um
-- insert direto em delivery_comprovantes, via policy acima).
drop function if exists public.motorista_baixar_entrega(uuid, text, text, text, date, text, text);

create or replace function public.motorista_baixar_entrega(
  p_delivery_id uuid,
  p_status text,
  p_ocorrencia text,
  p_nome_recebedor text,
  p_data_entrega date
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.deliveries;
begin
  if p_status not in ('ENTREGUE', 'FALHA', 'DEVOLVIDO') then
    raise exception 'Status inválido para baixa pelo motorista.';
  end if;

  update public.deliveries d
  set
    status = p_status,
    ocorrencia = coalesce(p_ocorrencia, d.ocorrencia),
    nome_recebedor = coalesce(p_nome_recebedor, d.nome_recebedor),
    data_entrega = coalesce(p_data_entrega, d.data_entrega)
  where d.id = p_delivery_id
    and d.motorista_id = auth.uid()
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'motorista'
  returning d.* into v_result;

  if v_result.id is null then
    raise exception 'Entrega não encontrada ou sem permissão para baixar.';
  end if;

  return v_result;
end;
$$;

grant execute on function public.motorista_baixar_entrega(uuid, text, text, text, date) to authenticated;

-- Storage do bucket "comprovantes" e suas policies não mudam: o path já é
-- {deliveryId}/{timestamp}-{nome}, então múltiplos arquivos já cabem na
-- mesma pasta sem nenhuma alteração.
