-- Cliente passa a enxergar as ocorrências registradas das próprias entregas
-- (necessário pro relatório CSV do cliente trazer a coluna "Última Ocorrência
-- Registrada"). Mesma regra de acesso usada em deliveries_select: CNPJ do
-- remetente (normalizado) bate com o document do perfil.
-- Rode este script inteiro no SQL Editor do painel Supabase.

drop policy if exists delivery_ocorrencias_select_cliente on public.delivery_ocorrencias;
create policy delivery_ocorrencias_select_cliente
  on public.delivery_ocorrencias
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'cliente'
    and exists (
      select 1 from public.deliveries d
      where d.id = delivery_ocorrencias.delivery_id
        and regexp_replace(coalesce(d.remetente_cnpj, ''), '\D', '', 'g') = (
          select regexp_replace(document, '\D', '', 'g')
          from public.profiles
          where id = auth.uid()
        )
    )
  );
