-- WLOGIS — adiciona genero ao perfil (usado pra escolher o avatar)
-- Rode no SQL Editor do painel Supabase.

alter table public.profiles
  add column if not exists genero text not null default 'nao_informado'
  check (genero in ('masculino', 'feminino', 'nao_informado'));

-- Atualiza a trigger de signup para gravar o genero enviado no cadastro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, profile_type, document, genero)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'profile_type', 'cliente'),
    coalesce(new.raw_user_meta_data ->> 'document', ''),
    coalesce(new.raw_user_meta_data ->> 'genero', 'nao_informado')
  );
  return new;
end;
$$;
