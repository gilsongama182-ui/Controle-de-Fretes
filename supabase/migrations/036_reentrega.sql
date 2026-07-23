-- 036_reentrega.sql — flag manual "houve reentrega?" por entrega (tela de
-- Faturamento, aba Pendentes). Quando marcado, soma 50% do frete calculado
-- como acréscimo de reentrega. Devolução usa o status EM DEVOLUÇÃO/DEVOLVIDO
-- já existente (sem precisar de flag novo) e soma 100% do frete calculado.

alter table public.deliveries
  add column if not exists reentrega boolean not null default false;
