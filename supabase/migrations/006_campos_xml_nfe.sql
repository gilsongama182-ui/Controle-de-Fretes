-- WLOGIS — campos extras para o DE/PARA da importação de XML de NF-e
-- Rode no SQL Editor do painel Supabase.

alter table public.deliveries
  add column if not exists numero text,              -- número do endereço (<nro>)
  add column if not exists complemento text,          -- complemento do endereço (<xCpl>)
  add column if not exists pedido text,               -- referência do pedido (<infAdic><infCpl>)
  add column if not exists chave_acesso_nfe text,      -- chave de acesso da NF-e — uso interno, não aparece em tela
  add column if not exists valor_total_nota numeric(12, 2); -- valor total da nota (<vNF>) — uso interno, não aparece em tela
