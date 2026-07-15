-- Carimbo de última sincronização automática via Loggi (login + leitura do
-- painel de envios), mesmo padrão do melhor_envio_last_sync_at. O matching
-- entre o painel da Loggi e a entrega é feito por codigo_rastreio, que já
-- existe na tabela — não precisa de um "loggi_id" equivalente ao
-- melhor_envio_id.
-- Rode este script inteiro no SQL Editor do painel Supabase.

alter table public.deliveries
  add column if not exists loggi_last_sync_at timestamptz;
