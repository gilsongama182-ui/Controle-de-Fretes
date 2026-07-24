-- 037_vinculo_parceiro_entrega.sql — vincula a entrega a um agregado/parceiro
-- cadastrado na tela de Parceiros (tela de Edição de Entrega). Mesmo padrão
-- de motorista_id/motorista_nome: parceiro_id é a referência real, parceiro_nome
-- é denormalizado pra exibição sem precisar de join.

alter table public.deliveries
  add column if not exists parceiro_id uuid references public.partners(id),
  add column if not exists parceiro_nome text;
