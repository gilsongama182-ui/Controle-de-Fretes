-- Alerta de FALHA para o cliente: null = ainda não lido, timestamp = quando o
-- cliente marcou como lido no sino de notificações da área do cliente. Um
-- timestamp em vez de um "lida boolean" já guarda o "quando" de graça.
alter table public.deliveries
  add column if not exists falha_lida_em timestamptz null;

-- Reabre o alerta sempre que o status (re)entra em FALHA — inclusive se essa
-- mesma entrega já tinha uma FALHA anterior marcada como lida.
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

-- Permite o cliente marcar como lida uma FALHA da própria empresa (CNPJ do
-- remetente = document do perfil), sem abrir uma policy de UPDATE genérica
-- em deliveries para o papel cliente (hoje não existe nenhuma, e não deve
-- passar a existir por causa disso). security definer só pra validar o CNPJ
-- e gravar essa única coluna — o resto da linha continua protegido pelas
-- policies de update existentes (só operador/master).
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
