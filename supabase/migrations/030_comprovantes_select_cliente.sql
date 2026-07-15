-- Cliente passa a poder visualizar (só leitura) os comprovantes de entrega
-- das próprias entregas — tanto o registro em delivery_comprovantes quanto
-- o arquivo em si no Storage (bucket "comprovantes"), senão createSignedUrl
-- falha mesmo com a linha liberada. Mesma regra de acesso usada em
-- deliveries_select/delivery_ocorrencias_select_cliente: CNPJ do remetente
-- (normalizado) bate com o document do perfil.
-- Rode este script inteiro no SQL Editor do painel Supabase.

drop policy if exists delivery_comprovantes_select_cliente on public.delivery_comprovantes;
create policy delivery_comprovantes_select_cliente
  on public.delivery_comprovantes
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'cliente'
    and exists (
      select 1 from public.deliveries d
      where d.id = delivery_comprovantes.delivery_id
        and regexp_replace(coalesce(d.remetente_cnpj, ''), '\D', '', 'g') = (
          select regexp_replace(document, '\D', '', 'g')
          from public.profiles
          where id = auth.uid()
        )
    )
  );

drop policy if exists comprovantes_select_cliente on storage.objects;
create policy comprovantes_select_cliente
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'cliente'
    and exists (
      select 1 from public.deliveries d
      where d.id = (split_part(name, '/', 1))::uuid
        and regexp_replace(coalesce(d.remetente_cnpj, ''), '\D', '', 'g') = (
          select regexp_replace(document, '\D', '', 'g')
          from public.profiles
          where id = auth.uid()
        )
    )
  );
