-- Novo status para carga devolvida ao remetente (retorno de entrega).
alter table public.deliveries
  drop constraint if exists deliveries_status_check;

alter table public.deliveries
  add constraint deliveries_status_check
  check (status in ('ENTREGUE', 'EM ROTA', 'EM ATRASO', 'FALHA', 'DEVOLVIDO'));
