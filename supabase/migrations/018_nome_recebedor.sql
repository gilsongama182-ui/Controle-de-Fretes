-- Nome de quem assinou/recebeu a entrega — preenchido manualmente pelo
-- operador na tela de edição, não vem do XML/CSV de importação.
alter table public.deliveries
  add column if not exists nome_recebedor text null;
