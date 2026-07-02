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
  profile_type text not null check (profile_type in ('cliente', 'operador', 'master')),
  document text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nfe text not null,
  remetente text,          -- quem contrata o frete (vincula a conta cliente)
  remetente_cnpj text,
  cliente text not null,   -- destinatário: quem recebe a carga
  nome_razao_social text not null,
  cnpj_cpf text not null,
  data_pedido date not null,
  data_expedicao date,
  previsao text,
  data_entrega date,        -- data real de entrega (preenchida quando status = ENTREGUE)
  endereco_completo text not null,
  bairro_distrito text,
  cep text,
  municipio text,
  uf text not null,
  fone_fax text,
  status text not null check (status in ('ENTREGUE', 'EM ROTA', 'EM ATRASO', 'FALHA')) default 'EM ROTA',
  ocorrencia text,
  valor_cobranca numeric(12, 2) not null default 0,
  valor_pagamento numeric(12, 2) not null default 0,
  codigo_rastreio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deliveries_status_idx on public.deliveries (status);
create index if not exists deliveries_uf_idx on public.deliveries (uf);
create index if not exists deliveries_cnpj_cpf_idx on public.deliveries (cnpj_cpf);

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
  insert into public.profiles (id, name, email, profile_type, document)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'profile_type', 'cliente'),
    coalesce(new.raw_user_meta_data ->> 'document', '')
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

-- profiles: cada usuário lê o próprio perfil; master lê todos (tela de Usuários)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  using (id = auth.uid() or public.current_profile_type() = 'master');

-- profiles: master pode alterar o papel de qualquer usuário
drop policy if exists profiles_update_master on public.profiles;
create policy profiles_update_master
  on public.profiles
  for update
  using (public.current_profile_type() = 'master');

-- deliveries: operador/master veem tudo; cliente vê só entregas cujo CNPJ do
-- REMETENTE (normalizado, sem pontuação) bate com o document do seu perfil.
drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select
  on public.deliveries
  for select
  using (
    public.current_profile_type() in ('operador', 'master')
    or regexp_replace(coalesce(remetente_cnpj, ''), '\D', '', 'g') = (
      select regexp_replace(document, '\D', '', 'g')
      from public.profiles
      where id = auth.uid()
    )
  );

-- deliveries: apenas operador/master criam/editam/removem
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
