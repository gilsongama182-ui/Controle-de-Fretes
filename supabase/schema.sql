-- WLOGIS — schema, RLS e trigger de perfil
-- Rode este script inteiro no SQL Editor do painel Supabase (Project > SQL Editor > New query).

create extension if not exists pgcrypto;

-- =========================================================
-- 1. Tabelas
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  profile_type text not null check (profile_type in ('cliente', 'operador', 'master', 'operador_log', 'motorista')),
  document text not null,
  genero text not null default 'nao_informado' check (genero in ('masculino', 'feminino', 'nao_informado')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  created_at timestamptz not null default now()
);
-- Numa instalação nova, aprove manualmente a primeira conta master:
-- update public.profiles set status = 'aprovado' where email = 'seu-email@empresa.com';

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nfe text not null,
  pedido text,             -- referência do pedido do cliente (<infAdic><infCpl> no XML)
  remetente text,          -- quem contrata o frete (vincula a conta cliente)
  remetente_cnpj text,
  remetente_endereco text,    -- usados na etiqueta de remessa 10x15cm
  remetente_numero text,
  remetente_complemento text,
  remetente_bairro text,
  remetente_cep text,
  remetente_municipio text,
  remetente_uf text,
  cliente text not null,   -- destinatário: quem recebe a carga
  nome_razao_social text not null,
  cnpj_cpf text not null,
  data_pedido date not null,
  data_expedicao date,
  previsao text,
  data_entrega date,        -- data real de entrega (preenchida quando status = ENTREGUE)
  nome_recebedor text,      -- quem assinou/recebeu a entrega, preenchido manualmente pelo operador
  endereco_completo text not null,
  numero text,              -- número do endereço (<nro> no XML)
  complemento text,         -- complemento do endereço (<xCpl> no XML)
  bairro_distrito text,
  cep text,
  municipio text,
  uf text not null,
  fone_fax text,
  status text not null check (status in ('ENTREGUE', 'EM ROTA', 'EM ATRASO', 'FALHA', 'DEVOLVIDO')) default 'EM ROTA',
  ocorrencia text,
  atraso_responsabilidade text not null check (atraso_responsabilidade in ('proprio', 'cliente')) default 'proprio',
  falha_lida_em timestamptz,
  valor_cobranca numeric(12, 2) not null default 0,
  valor_pagamento numeric(12, 2) not null default 0,
  codigo_rastreio text,
  chave_acesso_nfe text,          -- uso interno, não aparece em tela
  valor_total_nota numeric(12, 2), -- uso interno, não aparece em tela
  comprovante_path text,          -- caminho do arquivo no Storage (bucket privado "comprovantes")
  comprovante_nome text,          -- nome original do arquivo enviado
  melhor_envio_id text,           -- ID da etiqueta na Melhor Envio (nao e o codigo_rastreio publico)
  melhor_envio_last_sync_at timestamptz,
  motorista_id uuid references public.profiles(id), -- quem vai fazer a entrega (perfil motorista)
  motorista_nome text,            -- denormalizado, mesmo padrão de remetente/cliente
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deliveries_status_idx on public.deliveries (status);
create index if not exists deliveries_uf_idx on public.deliveries (uf);
create index if not exists deliveries_cnpj_cpf_idx on public.deliveries (cnpj_cpf);
create index if not exists deliveries_motorista_id_idx on public.deliveries (motorista_id);

-- Token OAuth da conta Melhor Envio conectada (uma conta só, pra toda a
-- empresa). Sem nenhuma policy de propósito (default-deny) — só a
-- service_role key, usada exclusivamente dentro das funções serverless
-- em /api/melhor-envio, consegue ler/escrever essa tabela.
create table if not exists public.melhor_envio_tokens (
  id text primary key default 'default',
  access_token text not null,
  refresh_token text not null,
  token_type text,
  expires_at timestamptz not null,
  scope text,
  connected_by uuid references public.profiles(id),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.melhor_envio_tokens enable row level security;

-- Volumes (cubagem) de cada entrega, 1:N — peso em kg, dimensões em cm.
-- Preenchida pela tela de Inclusão de Cubagem (papel operador_log/master).
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
alter table public.delivery_volumes enable row level security;

-- Cadastro de Agregados e Parceiros (diferenciados por "tipo"), só operador/master.
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),

  tipo text not null check (tipo in ('agregado', 'parceiro')),
  nome text not null,
  nome_fantasia text,
  cpf_cnpj text not null,
  rg text,
  inscricao_estadual text,

  telefone text,
  email text,
  responsavel text,

  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  municipio text,
  uf text,

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

  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partners_tipo_idx on public.partners (tipo);
create index if not exists partners_status_idx on public.partners (status);
alter table public.partners enable row level security;

-- Documentos anexos de cada Agregado/Parceiro (1:N) — rótulo + arquivo.
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

-- =========================================================
-- 2. updated_at automático em deliveries
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists deliveries_set_updated_at on public.deliveries;
create trigger deliveries_set_updated_at
  before update on public.deliveries
  for each row execute function public.set_updated_at();

drop trigger if exists delivery_volumes_set_updated_at on public.delivery_volumes;
create trigger delivery_volumes_set_updated_at
  before update on public.delivery_volumes
  for each row execute function public.set_updated_at();

drop trigger if exists partners_set_updated_at on public.partners;
create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

-- Reabre o alerta de FALHA (sino de notificações do cliente) sempre que o
-- status (re)entra em FALHA — inclusive se essa mesma entrega já tinha uma
-- FALHA anterior marcada como lida.
create or replace function public.reset_falha_lida_em()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'FALHA' and old.status is distinct from 'FALHA' then
    new.falha_lida_em = null;
  end if;
  return new;
end;
$$;

drop trigger if exists deliveries_reset_falha_lida_em on public.deliveries;
create trigger deliveries_reset_falha_lida_em
  before update on public.deliveries
  for each row execute function public.reset_falha_lida_em();

-- =========================================================
-- 3. Criação automática de profiles no signup
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, profile_type, document, genero)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'profile_type', 'cliente'),
    coalesce(new.raw_user_meta_data ->> 'document', ''),
    coalesce(new.raw_user_meta_data ->> 'genero', 'nao_informado')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- 4. Row Level Security
-- =========================================================

alter table public.profiles enable row level security;
alter table public.deliveries enable row level security;

-- Função auxiliar: papel do usuário logado
create or replace function public.current_profile_type()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select profile_type from public.profiles where id = auth.uid();
$$;

-- profiles: cada usuário lê o próprio perfil; master lê todos (tela de
-- Usuários); operador também lê perfis de motoristas aprovados (dropdown de
-- atribuição em Gestão/Edição de Entrega).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  using (
    id = auth.uid()
    or public.current_profile_type() = 'master'
    or (
      public.current_profile_type() = 'operador'
      and profile_type = 'motorista'
      and status = 'aprovado'
    )
  );

-- profiles: master pode alterar o papel/status de qualquer usuário
drop policy if exists profiles_update_master on public.profiles;
create policy profiles_update_master
  on public.profiles
  for update
  using (public.current_profile_type() = 'master');

-- Função auxiliar: status de aprovação do usuário logado
create or replace function public.current_profile_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select status from public.profiles where id = auth.uid();
$$;

-- deliveries: operador/master veem tudo; cliente vê só entregas cujo CNPJ do
-- REMETENTE (normalizado, sem pontuação) bate com o document do seu perfil;
-- motorista vê só as entregas atribuídas a ele. Em qualquer caso, exige
-- status = 'aprovado' (cadastros pendentes não veem nada).
drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select
  on public.deliveries
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and (
      public.current_profile_type() in ('operador', 'master', 'operador_log')
      or (public.current_profile_type() = 'motorista' and motorista_id = auth.uid())
      or regexp_replace(coalesce(remetente_cnpj, ''), '\D', '', 'g') = (
        select regexp_replace(document, '\D', '', 'g')
        from public.profiles
        where id = auth.uid()
      )
    )
  );

-- deliveries: apenas operador/master aprovados criam/editam/removem
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

-- Permite o cliente marcar como lida uma FALHA da própria empresa (CNPJ do
-- remetente = document do perfil), sem abrir uma policy de UPDATE genérica
-- em deliveries para o papel cliente (hoje não existe nenhuma). security
-- definer só pra validar o CNPJ e gravar essa única coluna — o resto da
-- linha continua protegido pelas policies de update acima (só operador/master).
create or replace function public.marcar_falha_lida(p_delivery_id uuid)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.deliveries;
begin
  update public.deliveries d
  set falha_lida_em = now()
  where d.id = p_delivery_id
    and d.status = 'FALHA'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'cliente'
    and regexp_replace(coalesce(d.remetente_cnpj, ''), '\D', '', 'g') = (
      select regexp_replace(document, '\D', '', 'g')
      from public.profiles
      where id = auth.uid()
    )
  returning d.* into v_result;

  if v_result.id is null then
    raise exception 'Entrega não encontrada ou sem permissão para marcar como lida.';
  end if;

  return v_result;
end;
$$;

grant execute on function public.marcar_falha_lida(uuid) to authenticated;

-- Baixa de entrega pelo motorista (nome recebedor, data, ocorrência, status,
-- comprovante) — não existe policy de UPDATE genérica pra esse papel (evita
-- liberar qualquer coluna da entrega); só essa função, restrita às colunas do
-- formulário mobile, e só na entrega que está atribuída a ele.
create or replace function public.motorista_baixar_entrega(
  p_delivery_id uuid,
  p_status text,
  p_ocorrencia text,
  p_nome_recebedor text,
  p_data_entrega date,
  p_comprovante_path text,
  p_comprovante_nome text
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
    data_entrega = coalesce(p_data_entrega, d.data_entrega),
    comprovante_path = coalesce(p_comprovante_path, d.comprovante_path),
    comprovante_nome = coalesce(p_comprovante_nome, d.comprovante_nome)
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

grant execute on function public.motorista_baixar_entrega(uuid, text, text, text, date, text, text) to authenticated;

-- delivery_volumes: operador/master (relatório de exportação) e operador_log
-- (tela de cubagem) leem; só operador_log/master criam/editam/removem.
drop policy if exists delivery_volumes_select on public.delivery_volumes;
create policy delivery_volumes_select
  on public.delivery_volumes
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master', 'operador_log')
  );

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

-- partners / partner_documents: só operador/master (nem cliente, nem operador_log)
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

-- =========================================================
-- 5. Storage — comprovantes de entrega (PNG/JPEG/PDF)
-- =========================================================

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

-- motorista pode anexar (e depois abrir) o comprovante só de entregas
-- atribuídas a ele. Sem update/delete: a foto só é enviada no momento de
-- salvar a baixa, não é substituída depois.
drop policy if exists comprovantes_insert_motorista on storage.objects;
create policy comprovantes_insert_motorista
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'comprovantes'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'motorista'
    and exists (
      select 1 from public.deliveries d
      where d.id = (split_part(name, '/', 1))::uuid
        and d.motorista_id = auth.uid()
    )
  );

drop policy if exists comprovantes_select_motorista on storage.objects;
create policy comprovantes_select_motorista
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'motorista'
    and exists (
      select 1 from public.deliveries d
      where d.id = (split_part(name, '/', 1))::uuid
        and d.motorista_id = auth.uid()
    )
  );

-- Storage — documentos de Agregados/Parceiros (PNG/JPEG/PDF), bucket privado.
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
