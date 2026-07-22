-- 033_faturamento.sql — cabeçalho de fatura (agrupa N entregas sob um
-- número de fatura) + colunas em "deliveries" pro valor de frete calculado
-- automaticamente (peso/cubagem x tabela) e o vínculo com a fatura.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  criado_em timestamptz not null default now(),
  criado_por uuid references public.profiles(id)
);

alter table public.invoices enable row level security;

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

-- Vínculo com a entrega (1 fatura : N entregas) + valor calculado pela tela
-- de Faturamento (peso/cubagem x tabela de frete + GRIS/Ad-Valorem/Tx
-- Fluvial) — separado de "valor_cobranca", que continua editável manualmente
-- do jeito que já era.
alter table public.deliveries
  add column if not exists invoice_id uuid references public.invoices(id),
  add column if not exists valor_frete_calculado numeric(10, 2);

create index if not exists deliveries_invoice_id_idx on public.deliveries (invoice_id);

-- Cria o cabeçalho da fatura e vincula as entregas selecionadas numa única
-- transação (uma sem a outra deixaria fatura órfã ou entrega "perdida" sem
-- número) — mesmo raciocínio do motorista_baixar_entrega, mas aqui sem
-- security definer: operador/master já têm INSERT/UPDATE liberado por RLS
-- nas duas tabelas, então a função roda com o privilégio de quem chama.
create or replace function public.criar_fatura(
  p_numero text,
  p_delivery_ids uuid[]
)
returns public.invoices
language plpgsql
as $$
declare
  v_invoice public.invoices;
begin
  insert into public.invoices (numero, criado_por)
  values (p_numero, auth.uid())
  returning * into v_invoice;

  -- "and invoice_id is null" evita roubar uma entrega que já esteja em outra
  -- fatura (ex: duas abas do navegador gerando fatura ao mesmo tempo).
  update public.deliveries
  set invoice_id = v_invoice.id
  where id = any(p_delivery_ids)
    and invoice_id is null;

  return v_invoice;
end;
$$;

grant execute on function public.criar_fatura(text, uuid[]) to authenticated;

-- Desfaz uma fatura: libera as entregas vinculadas (voltam a "pendente") e
-- remove o cabeçalho — mesma lógica atômica do criar_fatura.
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
