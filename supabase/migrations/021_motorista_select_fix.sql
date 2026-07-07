-- Corrige a policy deliveries_select de 020_motorista.sql: a cláusula de
-- comparação de CNPJ (remetente_cnpj vs document do perfil) rodava pra
-- QUALQUER perfil sem policy própria, inclusive motorista — se o document
-- dele "batesse" (mesmo vazio/normalizado) com entregas sem remetente_cnpj
-- preenchido, ele enxergava entregas de outras contas. Agora essa cláusula
-- só vale pro papel cliente, que é o único a que ela se destina.
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
