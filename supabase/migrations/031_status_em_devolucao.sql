-- Novo status para carga que já iniciou o processo de devolução ao
-- remetente, mas ainda não foi confirmada como devolvida (intermediário
-- entre EM ATRASO/FALHA e DEVOLVIDO).
alter table public.deliveries
  drop constraint if exists deliveries_status_check;

alter table public.deliveries
  add constraint deliveries_status_check
  check (status in ('AGUARDANDO EXPEDIÇÃO', 'ENTREGUE', 'EM ROTA', 'EM ATRASO', 'FALHA', 'EM DEVOLUÇÃO', 'DEVOLVIDO'));
