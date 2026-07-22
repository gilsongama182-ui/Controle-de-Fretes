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
  status text not null check (status in ('AGUARDANDO EXPEDIÇÃO', 'ENTREGUE', 'EM ROTA', 'EM ATRASO', 'FALHA', 'EM DEVOLUÇÃO', 'DEVOLVIDO')) default 'EM ROTA',
  ocorrencia text,
  atraso_responsabilidade text not null check (atraso_responsabilidade in ('proprio', 'cliente')) default 'proprio',
  falha_lida_em timestamptz,
  valor_cobranca numeric(12, 2) not null default 0,
  valor_pagamento numeric(12, 2) not null default 0,
  codigo_rastreio text,
  chave_acesso_nfe text,          -- uso interno, não aparece em tela
  valor_total_nota numeric(12, 2), -- uso interno, não aparece em tela
  melhor_envio_id text,           -- ID da etiqueta na Melhor Envio (nao e o codigo_rastreio publico)
  melhor_envio_last_sync_at timestamptz,
  loggi_last_sync_at timestamptz,
  motorista_id uuid references public.profiles(id), -- quem vai fazer a entrega (perfil motorista)
  motorista_nome text,            -- denormalizado, mesmo padrão de remetente/cliente
  invoice_id uuid,                -- fatura em que essa entrega foi agrupada (null = pendente de faturar)
  valor_frete_calculado numeric(10, 2), -- cálculo automático (peso/cubagem x tabela de frete + GRIS/Ad-Valorem/Tx Fluvial), separado de valor_cobranca
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

-- Comprovantes de entrega (1:N) — cada linha é 1 arquivo (PNG/JPEG/PDF)
-- anexado por operador/master ou pelo motorista no momento da baixa.
create table if not exists public.delivery_comprovantes (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  arquivo_path text not null,
  arquivo_nome text not null,
  created_at timestamptz not null default now()
);
create index if not exists delivery_comprovantes_delivery_id_idx on public.delivery_comprovantes (delivery_id);
alter table public.delivery_comprovantes enable row level security;

-- Tabela de frete (UF/tipo de tarifa/faixa de CEP x faixa de peso) usada no
-- cálculo automático da tela de Faturamento. Leitura operador/master,
-- escrita só master (erro aqui afeta o cálculo de todas as entregas
-- faturadas dali pra frente, não só um registro).
create table if not exists public.freight_rates (
  id uuid primary key default gen_random_uuid(),
  uf text not null,
  tipo_tarifa text not null check (tipo_tarifa in ('Capital', 'Interior')),
  cep_inicial text not null,
  cep_final text not null,
  valor_5kg numeric(10, 2) not null default 0,
  valor_10kg numeric(10, 2) not null default 0,
  valor_15kg numeric(10, 2) not null default 0,
  valor_20kg numeric(10, 2) not null default 0,
  valor_30kg numeric(10, 2) not null default 0,
  kg_adicional numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists freight_rates_uf_idx on public.freight_rates (uf);
alter table public.freight_rates enable row level security;

insert into public.freight_rates
  (uf, tipo_tarifa, cep_inicial, cep_final, valor_5kg, valor_10kg, valor_15kg, valor_20kg, valor_30kg, kg_adicional)
select * from (values
  ('AC', 'Capital',  '69900-000', '69923-999',  89.50,  99.07, 120.81, 137.02, 164.82,  4.71),
  ('AC', 'Interior', '69924-000', '69999-999', 158.30, 189.40, 230.78, 297.61, 337.16, 12.33),
  ('AL', 'Capital',  '57000-000', '57099-999',  86.16,  97.65, 112.58, 138.43, 167.63,  2.75),
  ('AL', 'Interior', '57100-000', '57999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.32),
  ('AM', 'Capital',  '69000-000', '69099-999', 103.28, 122.05, 137.02, 151.99, 164.82, 10.44),
  ('AM', 'Interior', '69100-000', '69299-999', 158.30, 189.40, 230.78, 297.61, 337.16, 18.07),
  ('AM', 'Interior', '69400-000', '69899-999', 158.30, 189.40, 230.78, 297.61, 337.16, 18.07),
  ('AP', 'Capital',  '68900-000', '68914-999',  89.50,  99.07, 120.81, 137.02, 164.82,  4.71),
  ('AP', 'Interior', '68915-000', '68999-999', 158.30, 189.40, 230.78, 297.61, 337.16, 12.33),
  ('BA', 'Capital',  '40000-000', '44470-999',  86.16,  97.65, 112.58, 138.43, 167.63,  2.75),
  ('BA', 'Interior', '44471-000', '48999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.32),
  ('CE', 'Capital',  '60000-000', '61900-999',  97.65, 112.58, 131.25, 155.09, 171.63,  4.92),
  ('CE', 'Interior', '61901-000', '63999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  9.50),
  ('DF', 'Capital',  '70000-000', '70999-999',  91.90, 105.69, 113.73, 133.15, 138.74,  2.01),
  ('DF', 'Interior', '71000-000', '72799-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('DF', 'Interior', '73000-000', '73699-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('ES', 'Capital',  '29000-000', '29099-999',  74.67,  84.47, 111.97, 121.36, 133.98,  2.01),
  ('ES', 'Interior', '29100-000', '29999-999',  80.99, 101.70, 121.36, 159.28, 190.44,  5.07),
  ('GO', 'Capital',  '74000-000', '74899-999',  86.16, 105.69, 113.73, 133.15, 138.74,  2.01),
  ('GO', 'Interior', '72800-000', '72999-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('GO', 'Interior', '73700-000', '73999-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('GO', 'Interior', '74900-000', '76799-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('MA', 'Capital',  '65000-000', '65099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  2.93),
  ('MA', 'Interior', '65100-000', '65999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.50),
  ('MG', 'Capital',  '30000-000', '34999-999',  57.44,  72.99,  89.00, 109.87, 133.98,  1.28),
  ('MG', 'Interior', '35000-000', '39999-999',  80.42,  97.65, 111.02, 124.07, 141.07,  4.33),
  ('MS', 'Capital',  '79000-000', '79129-999', 101.09,  94.79, 118.07, 142.69, 177.74,  2.93),
  ('MS', 'Interior', '79130-000', '79999-999', 111.43, 132.11, 152.22, 172.32, 190.56,  7.50),
  ('MT', 'Capital',  '78000-000', '78109-999', 101.09, 103.53, 129.70, 155.86, 195.24,  3.29),
  ('MT', 'Interior', '78110-000', '78899-999', 111.43, 132.11, 152.22, 172.32, 190.56,  7.86),
  ('PA', 'Capital',  '66000-000', '67999-999',  80.99,  94.79, 118.07, 132.11, 152.10,  2.93),
  ('PA', 'Interior', '68000-000', '68899-999', 158.30, 189.40, 230.78, 297.61, 337.16, 10.56),
  ('PB', 'Capital',  '58000-000', '58099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  4.20),
  ('PB', 'Interior', '58100-000', '58999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  8.78),
  ('PE', 'Capital',  '50000-000', '54999-999',  97.65, 112.58, 131.25, 155.09, 171.63,  3.47),
  ('PE', 'Interior', '55000-000', '56999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  8.04),
  ('PI', 'Capital',  '64000-000', '64099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  2.93),
  ('PI', 'Interior', '64100-000', '64999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.50),
  ('PR', 'Capital',  '80000-000', '83800-999',  74.67,  85.01,  98.80, 114.13, 132.34,  1.28),
  ('PR', 'Interior', '83801-000', '87999-999',  91.90, 105.69, 138.78, 165.71, 195.63,  4.33),
  ('RJ', 'Capital',  '20000-000', '26600-999',  57.44,  72.99,  89.00, 109.87, 133.98,  1.28),
  ('RJ', 'Interior', '26601-000', '28999-999',  80.42,  97.65, 111.02, 124.07, 141.07,  4.33),
  ('RN', 'Capital',  '59000-000', '59099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  4.20),
  ('RN', 'Interior', '59100-000', '59999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  8.78),
  ('RO', 'Capital',  '76800-000', '76823-999',  89.50,  99.07, 120.81, 137.02, 164.82,  4.71),
  ('RO', 'Interior', '76824-000', '76999-999', 158.30, 189.40, 230.78, 297.61, 337.16, 12.33),
  ('RR', 'Capital',  '69300-000', '69339-999',  89.50,  99.07, 120.81, 137.02, 164.82, 36.80),
  ('RR', 'Interior', '69340-000', '69389-999', 160.83, 183.81, 235.68, 304.64, 351.36, 44.42),
  ('RS', 'Capital',  '90000-000', '94900-999',  74.67,  85.01,  98.80, 114.13, 132.34,  2.01),
  ('RS', 'Interior', '94901-000', '99999-999',  91.90, 105.69, 138.78, 165.71, 195.63,  5.07),
  ('SC', 'Capital',  '88000-000', '88469-999',  74.67,  85.01,  98.80, 114.13, 132.34,  1.28),
  ('SC', 'Interior', '88470-000', '89999-999',  91.90, 105.69, 138.78, 165.71, 195.63,  4.33),
  ('SE', 'Capital',  '49000-000', '49099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  2.75),
  ('SE', 'Interior', '49100-000', '49999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.32),
  ('SP', 'Capital',  '01000-000', '09999-999',  40.21,  51.70,  63.41,  80.42,  94.34,  1.01),
  ('SP', 'Interior', '11000-000', '19999-999',  86.16, 120.62, 138.62, 153.09, 174.45,  3.06),
  ('TO', 'Capital',  '77000-000', '77270-999', 103.39, 112.58, 143.60, 161.18, 189.07,  2.93),
  ('TO', 'Interior', '77300-000', '77995-999', 120.62, 129.81, 160.83, 183.69, 207.79,  7.50)
) as v(uf, tipo_tarifa, cep_inicial, cep_final, valor_5kg, valor_10kg, valor_15kg, valor_20kg, valor_30kg, kg_adicional)
where not exists (select 1 from public.freight_rates);

-- Cabeçalho de fatura — agrupa N entregas (deliveries.invoice_id) sob um
-- número de fatura só. Ver a FK abaixo, criada depois de "deliveries" já
-- existir (aqui "deliveries" vem antes de "invoices" no arquivo).
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  criado_em timestamptz not null default now(),
  criado_por uuid references public.profiles(id)
);
alter table public.invoices enable row level security;

alter table public.deliveries
  drop constraint if exists deliveries_invoice_id_fkey;
alter table public.deliveries
  add constraint deliveries_invoice_id_fkey foreign key (invoice_id) references public.invoices(id);
create index if not exists deliveries_invoice_id_idx on public.deliveries (invoice_id);

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

drop trigger if exists freight_rates_set_updated_at on public.freight_rates;
create trigger freight_rates_set_updated_at
  before update on public.freight_rates
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
-- status = 'aprovado' (cadastros pendentes não veem nada). A cláusula de
-- CNPJ é restrita ao papel cliente — sem isso, um document "vazio" (ou
-- coincidente com entregas sem remetente_cnpj) vazaria entregas pra
-- qualquer outro papel sem policy própria.
drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select
  on public.deliveries
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and (
      public.current_profile_type() in ('operador', 'master', 'operador_log')
      or (public.current_profile_type() = 'motorista' and motorista_id = auth.uid())
      or (
        public.current_profile_type() = 'cliente'
        and regexp_replace(coalesce(remetente_cnpj, ''), '\D', '', 'g') = (
          select regexp_replace(document, '\D', '', 'g')
          from public.profiles
          where id = auth.uid()
        )
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

-- Baixa de entrega pelo motorista (nome recebedor, data, ocorrência, status)
-- — não existe policy de UPDATE genérica pra esse papel (evita liberar
-- qualquer coluna da entrega); só essa função, restrita às colunas do
-- formulário mobile, e só na entrega que está atribuída a ele. O comprovante
-- (1 ou mais fotos) é anexado à parte, via insert direto em
-- delivery_comprovantes (policy motorista abaixo), não por esta função.
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

-- freight_rates: leitura operador/master, escrita só master.
drop policy if exists freight_rates_select on public.freight_rates;
create policy freight_rates_select
  on public.freight_rates
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists freight_rates_insert on public.freight_rates;
create policy freight_rates_insert
  on public.freight_rates
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'master'
  );

drop policy if exists freight_rates_update on public.freight_rates;
create policy freight_rates_update
  on public.freight_rates
  for update
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'master'
  );

drop policy if exists freight_rates_delete on public.freight_rates;
create policy freight_rates_delete
  on public.freight_rates
  for delete
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'master'
  );

-- invoices: operador/master leem/criam/removem (mesmo nível de deliveries).
drop policy if exists invoices_select on public.invoices;
create policy invoices_select
  on public.invoices
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert
  on public.invoices
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete
  on public.invoices
  for delete
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

-- Numeração sequencial automática da fatura (começa em 0200, zero-padded a
-- 4 dígitos) — o usuário nunca digita o número.
create sequence if not exists public.invoice_numero_seq start 200;
grant usage, select on sequence public.invoice_numero_seq to authenticated;

-- Cria o cabeçalho da fatura e vincula as entregas selecionadas numa única
-- transação — sem security definer: operador/master já têm INSERT/UPDATE
-- liberado por RLS nas duas tabelas, então a função roda com o privilégio
-- de quem chama.
create or replace function public.criar_fatura(p_delivery_ids uuid[])
returns public.invoices
language plpgsql
as $$
declare
  v_invoice public.invoices;
  v_numero text;
begin
  v_numero := lpad(nextval('public.invoice_numero_seq')::text, 4, '0');

  insert into public.invoices (numero, criado_por)
  values (v_numero, auth.uid())
  returning * into v_invoice;

  update public.deliveries
  set invoice_id = v_invoice.id
  where id = any(p_delivery_ids)
    and invoice_id is null;

  return v_invoice;
end;
$$;

grant execute on function public.criar_fatura(uuid[]) to authenticated;

-- Só pra mostrar em tela qual vai ser o próximo número, sem consumir a
-- sequência (nextval() "queimaria" um número se o usuário só olhasse a tela).
create or replace function public.proximo_numero_fatura()
returns text
language sql
stable
as $$
  select lpad((last_value + case when is_called then 1 else 0 end)::text, 4, '0')
  from public.invoice_numero_seq;
$$;

grant execute on function public.proximo_numero_fatura() to authenticated;

-- Desfaz uma fatura: libera as entregas vinculadas e remove o cabeçalho.
create or replace function public.remover_fatura(p_invoice_id uuid)
returns void
language plpgsql
as $$
begin
  update public.deliveries set invoice_id = null where invoice_id = p_invoice_id;
  delete from public.invoices where id = p_invoice_id;
end;
$$;

grant execute on function public.remover_fatura(uuid) to authenticated;

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

-- delivery_comprovantes: operador/master têm CRUD completo; motorista só
-- lê/insere nos comprovantes das entregas atribuídas a ele (sem update/delete
-- — a foto é enviada no momento da baixa, não é substituída depois).
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
