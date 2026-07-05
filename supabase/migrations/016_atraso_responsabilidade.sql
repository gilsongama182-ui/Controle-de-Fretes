-- Flag "Responsável pelo Atraso" (Próprio/Cliente): quando o atraso é
-- causado pelo cliente (destinatário indisponível, recusou recebimento
-- etc.), não deve contar contra os indicadores de performance de prazo.
alter table public.deliveries
  add column if not exists atraso_responsabilidade text not null default 'proprio'
    check (atraso_responsabilidade in ('proprio', 'cliente'));
