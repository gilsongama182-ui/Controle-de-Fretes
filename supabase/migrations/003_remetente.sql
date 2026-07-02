-- WLOGIS — adiciona Remetente (quem contrata o frete) às entregas
-- Rode no SQL Editor do painel Supabase.
--
-- Até aqui, o CNPJ/CPF vinculado a uma entrega era o do DESTINATÁRIO
-- (quem recebe a carga). Mas o cliente que faz login no WLOGIS é quem
-- CONTRATA o frete (o remetente) — são pessoas/empresas diferentes.
-- Esta migration separa os dois papéis e passa a vincular o usuário
-- cliente pelo CNPJ do remetente, não mais pelo do destinatário.

-- 1) Novas colunas
alter table public.deliveries add column if not exists remetente text;
alter table public.deliveries add column if not exists remetente_cnpj text;

-- 2) cliente vê suas próprias entregas pelo CNPJ do REMETENTE
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
