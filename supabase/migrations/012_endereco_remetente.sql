-- Endereço do remetente (usado na etiqueta de remessa 10x15cm).
-- Rode este script no SQL Editor do painel Supabase.

alter table public.deliveries
  add column if not exists remetente_endereco text,
  add column if not exists remetente_numero text,
  add column if not exists remetente_complemento text,
  add column if not exists remetente_bairro text,
  add column if not exists remetente_cep text,
  add column if not exists remetente_municipio text,
  add column if not exists remetente_uf text;
