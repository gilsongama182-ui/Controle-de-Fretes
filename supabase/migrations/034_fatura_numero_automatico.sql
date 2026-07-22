-- 034_fatura_numero_automatico.sql — numeração sequencial automática da
-- fatura (começando em 0200, zero-padded a 4 dígitos), sem precisar digitar
-- número na tela de Faturamento.

create sequence if not exists public.invoice_numero_seq start 200;
grant usage, select on sequence public.invoice_numero_seq to authenticated;

-- Assinatura antiga (com p_numero) fica obsoleta — o número agora é sempre
-- gerado aqui dentro, nunca digitado pelo usuário.
drop function if exists public.criar_fatura(text, uuid[]);

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
-- sequência (nextval() consumiria e "queimaria" um número não usado se o
-- usuário só olhar a tela e não gerar a fatura).
create or replace function public.proximo_numero_fatura()
returns text
language sql
stable
as $$
  select lpad((last_value + case when is_called then 1 else 0 end)::text, 4, '0')
  from public.invoice_numero_seq;
$$;

grant execute on function public.proximo_numero_fatura() to authenticated;
