-- 035_valor_acordado.sql — valor de frete negociado manualmente por entrega
-- (tela de Faturamento, aba Pendentes). Quando preenchido, substitui o valor
-- calculado automaticamente (peso/cubagem x tabela de frete) daquela linha,
-- tanto na tela quanto na fatura gerada.

alter table public.deliveries
  add column if not exists valor_acordado numeric(10, 2);
