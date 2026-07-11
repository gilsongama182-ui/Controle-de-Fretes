-- Ocorrências tipificadas (destinatário ausente, endereço incorreto, recusado
-- pelo destinatário) com data, registradas por entrega. Diferente do campo
-- livre `ocorrencia` (texto único, "última ocorrência"): aqui cada ocorrência
-- fica guardada com sua própria data, e uma nova não substitui as anteriores
-- (mesmo padrão de tabela filha de delivery_comprovantes, ver
-- 022_comprovantes_multiplos.sql).
-- Rode este script inteiro no SQL Editor do painel Supabase.

create table if not exists public.delivery_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  tipo text not null check (tipo in ('DESTINATÁRIO AUSENTE', 'ENDEREÇO INCORRETO', 'RECUSADO PELO DESTINATÁRIO')),
  data_ocorrencia date not null,
  created_at timestamptz not null default now()
);

create index if not exists delivery_ocorrencias_delivery_id_idx on public.delivery_ocorrencias (delivery_id);
alter table public.delivery_ocorrencias enable row level security;

drop policy if exists delivery_ocorrencias_select on public.delivery_ocorrencias;
create policy delivery_ocorrencias_select
  on public.delivery_ocorrencias
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists delivery_ocorrencias_insert on public.delivery_ocorrencias;
create policy delivery_ocorrencias_insert
  on public.delivery_ocorrencias
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists delivery_ocorrencias_delete on public.delivery_ocorrencias;
create policy delivery_ocorrencias_delete
  on public.delivery_ocorrencias
  for delete
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );
