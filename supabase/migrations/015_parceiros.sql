-- 015_parceiros.sql — cadastro de Agregados e Parceiros + documentos anexos

-- 1) Tabela principal (Agregado e Parceiro compartilham a tabela, diferenciados por "tipo")
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),

  -- Dados gerais
  tipo text not null check (tipo in ('agregado', 'parceiro')),
  nome text not null,
  nome_fantasia text,
  cpf_cnpj text not null,
  rg text,
  inscricao_estadual text,

  -- Contato
  telefone text,
  email text,
  responsavel text,

  -- Endereço
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  municipio text,
  uf text,

  -- Dados bancários
  banco text,
  agencia text,
  conta text,
  tipo_conta text,
  pix text,

  -- Específico de Agregado (veículo/motorista)
  veiculo_placa text,
  veiculo_tipo text,
  veiculo_modelo text,
  veiculo_ano text,
  veiculo_renavam text,
  capacidade_peso_kg numeric(10, 2),
  capacidade_volume_m3 numeric(10, 2),
  cnh_numero text,
  cnh_categoria text,
  cnh_validade date,
  seguro_apolice text,
  seguro_validade date,

  -- Específico de Parceiro (empresa)
  segmento text,
  regiao_atuacao text,
  data_inicio_parceria date,
  homologado_qualidade text check (homologado_qualidade in ('sim', 'nao')),

  -- Controle
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partners_tipo_idx on public.partners (tipo);
create index if not exists partners_status_idx on public.partners (status);

drop trigger if exists partners_set_updated_at on public.partners;
create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;

-- 2) Documentos anexos (1:N) — cada linha é um arquivo com rótulo (CNH, CRLV, Contrato Social etc.)
create table if not exists public.partner_documents (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  rotulo text not null,
  arquivo_path text not null,
  arquivo_nome text not null,
  created_at timestamptz not null default now()
);

create index if not exists partner_documents_partner_id_idx on public.partner_documents (partner_id);
alter table public.partner_documents enable row level security;

-- 3) RLS — só operador/master aprovados (nem cliente, nem operador_log)
drop policy if exists partners_select on public.partners;
create policy partners_select
  on public.partners
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists partners_insert on public.partners;
create policy partners_insert
  on public.partners
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists partners_update on public.partners;
create policy partners_update
  on public.partners
  for update
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists partners_delete on public.partners;
create policy partners_delete
  on public.partners
  for delete
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists partner_documents_select on public.partner_documents;
create policy partner_documents_select
  on public.partner_documents
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists partner_documents_insert on public.partner_documents;
create policy partner_documents_insert
  on public.partner_documents
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists partner_documents_update on public.partner_documents;
create policy partner_documents_update
  on public.partner_documents
  for update
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists partner_documents_delete on public.partner_documents;
create policy partner_documents_delete
  on public.partner_documents
  for delete
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

-- 4) Storage — documentos dos parceiros (PNG/JPEG/PDF), bucket privado
insert into storage.buckets (id, name, public)
values ('documentos-parceiros', 'documentos-parceiros', false)
on conflict (id) do nothing;

drop policy if exists documentos_parceiros_insert on storage.objects;
create policy documentos_parceiros_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documentos-parceiros'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists documentos_parceiros_select on storage.objects;
create policy documentos_parceiros_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documentos-parceiros'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists documentos_parceiros_update on storage.objects;
create policy documentos_parceiros_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'documentos-parceiros'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  )
  with check (
    bucket_id = 'documentos-parceiros'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists documentos_parceiros_delete on storage.objects;
create policy documentos_parceiros_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documentos-parceiros'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );
