-- Perfil "motorista" (acesso mobile) + atribuição de entregas a um motorista.

-- 1) Permite 'motorista' como profile_type
alter table public.profiles drop constraint if exists profiles_profile_type_check;
alter table public.profiles add constraint profiles_profile_type_check
  check (profile_type in ('cliente', 'operador', 'master', 'operador_log', 'motorista'));

-- 2) Vínculo entrega -> motorista responsável (denormaliza o nome, mesmo
-- padrão já usado em remetente/cliente, pra não depender de join).
alter table public.deliveries
  add column if not exists motorista_id uuid references public.profiles(id),
  add column if not exists motorista_nome text;

create index if not exists deliveries_motorista_id_idx on public.deliveries (motorista_id);

-- 3) operador/master também podem ler perfis de motoristas aprovados
-- (necessário pro dropdown de atribuição em Gestão/Edição de Entrega).
-- master continua enxergando todos os perfis (tela de Usuários).
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

-- 4) motorista aprovado enxerga só as entregas atribuídas a ele.
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

-- 5) Baixa de entrega pelo motorista — não há policy de UPDATE genérica pra
-- esse papel (evita liberar qualquer coluna); só essa função, restrita às
-- colunas do formulário mobile, na entrega que está atribuída a ele.
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

-- 6) Storage — motorista pode anexar (e depois abrir) o comprovante só de
-- entregas atribuídas a ele. Sem update/delete: a foto só é enviada no
-- momento de salvar a baixa, não é substituída depois.
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
