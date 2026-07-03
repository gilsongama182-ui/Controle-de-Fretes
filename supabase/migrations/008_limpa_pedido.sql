-- Limpa o campo "pedido": mantém só dígitos (sem espaço, ponto ou outra
-- pontuação). Rode este script no SQL Editor do painel Supabase.

update public.deliveries
set pedido = regexp_replace(coalesce(pedido, ''), '\D', '', 'g')
where pedido is not null
  and pedido <> regexp_replace(pedido, '\D', '', 'g');
