-- WLOGIS — adiciona Data de Entrega (data real, diferente da Previsão)
-- Rode no SQL Editor do painel Supabase.

alter table public.deliveries add column if not exists data_entrega date;
