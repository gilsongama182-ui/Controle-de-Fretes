-- Acrescenta "DESTINATÁRIO DESCONHECIDO" e "ENDEREÇO INCOMPLETO" ao
-- catálogo de ocorrências tipificadas (delivery_ocorrencias.tipo).
-- Rode este script inteiro no SQL Editor do painel Supabase.

alter table public.delivery_ocorrencias drop constraint if exists delivery_ocorrencias_tipo_check;
alter table public.delivery_ocorrencias add constraint delivery_ocorrencias_tipo_check
  check (tipo in (
    'DESTINATÁRIO AUSENTE',
    'ENDEREÇO INCORRETO',
    'RECUSADO PELO DESTINATÁRIO',
    'DESTINATÁRIO DESCONHECIDO',
    'ENDEREÇO INCOMPLETO'
  ));
