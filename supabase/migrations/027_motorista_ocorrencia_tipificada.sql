-- Permite que o motorista registre, junto com a baixa (falha/devolvido), uma
-- ocorrência tipificada (mesmo catálogo usado na tela de gerenciamento:
-- DESTINATÁRIO AUSENTE / ENDEREÇO INCORRETO / RECUSADO PELO DESTINATÁRIO).
-- Não abre policy de insert direta em delivery_ocorrencias pro motorista —
-- mantém o mesmo padrão da baixa de entrega: tudo passa pela função
-- security definer, que já valida que a entrega está atribuída a ele.
-- Rode este script inteiro no SQL Editor do painel Supabase.

drop function if exists public.motorista_baixar_entrega(uuid, text, text, text, date);

create or replace function public.motorista_baixar_entrega(
  p_delivery_id uuid,
  p_status text,
  p_ocorrencia text,
  p_nome_recebedor text,
  p_data_entrega date,
  p_tipo_ocorrencia text default null,
  p_data_ocorrencia date default null
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

  if p_tipo_ocorrencia is not null then
    insert into public.delivery_ocorrencias (delivery_id, tipo, data_ocorrencia)
    values (p_delivery_id, p_tipo_ocorrencia, coalesce(p_data_ocorrencia, current_date));
  end if;

  return v_result;
end;
$$;

grant execute on function public.motorista_baixar_entrega(uuid, text, text, text, date, text, date) to authenticated;
