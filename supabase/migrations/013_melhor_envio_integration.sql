-- Integração com a Melhor Envio (rastreio de fretes J&T/Loggi).
-- Rode este script no SQL Editor do painel Supabase.

alter table public.deliveries
  add column if not exists melhor_envio_id text,          -- ID da etiqueta na Melhor Envio (não é o codigo_rastreio publico)
  add column if not exists melhor_envio_last_sync_at timestamptz;

-- Guarda o token OAuth da conta Melhor Envio conectada (uma conta só, pra
-- toda a empresa). Não segue o padrão normal de policy-por-papel do projeto
-- de propósito: nenhuma policy é criada aqui, então por padrão NINGUÉM
-- (nem operador, nem master, nem anon) consegue ler/escrever essa tabela
-- pela API do Supabase — só a service_role key, usada exclusivamente
-- dentro das funções serverless em /api/melhor-envio, tem acesso.
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
-- Sem nenhuma "create policy" aqui — isso é intencional (default-deny).
