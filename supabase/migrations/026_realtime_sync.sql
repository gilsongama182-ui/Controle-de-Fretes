-- Habilita o Supabase Realtime nas tabelas que alimentam as telas do app,
-- pra que insercao/edicao/exclusao feita por um usuario (ex: novo frete)
-- apareca nas telas abertas de outros usuarios sem precisar de F5.
-- RLS continua valendo nos eventos de realtime, entao cada cliente so recebe
-- as mudancas das linhas que ele ja teria permissao de enxergar via select.
-- Rode este script inteiro no SQL Editor do painel Supabase.

alter publication supabase_realtime add table public.deliveries;
alter publication supabase_realtime add table public.delivery_volumes;
alter publication supabase_realtime add table public.delivery_comprovantes;
alter publication supabase_realtime add table public.delivery_ocorrencias;
