-- Novo status para nota fiscal ainda sem Data de Expedição preenchida.
alter table public.deliveries
  drop constraint if exists deliveries_status_check;

alter table public.deliveries
  add constraint deliveries_status_check
  check (status in ('AGUARDANDO EXPEDIÇÃO', 'ENTREGUE', 'EM ROTA', 'EM ATRASO', 'FALHA', 'DEVOLVIDO'));
