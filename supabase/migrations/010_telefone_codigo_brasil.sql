-- Alguns números vieram do XML com o código do Brasil (55) na frente, o que
-- dava 12/13 dígitos e escapava do formato "(XX) XXXXX-XXXX" da migration
-- 009. Com 12/13 dígitos o "55" só pode ser o código do país (um DDD sozinho
-- já dá 10/11 dígitos), então é seguro remover antes de formatar.
-- Rode este script no SQL Editor do Supabase.

with cleaned as (
  select id, regexp_replace(fone_fax, '\D', '', 'g') as raw_digits
  from public.deliveries
  where fone_fax is not null
),
normalized as (
  select
    id,
    case
      when length(raw_digits) in (12, 13) and raw_digits like '55%'
        then substring(raw_digits from 3)
      else raw_digits
    end as digits
  from cleaned
)
update public.deliveries d
set fone_fax = case
  when length(n.digits) = 11 then regexp_replace(n.digits, '(\d{2})(\d{5})(\d{4})', '(\1) \2-\3')
  when length(n.digits) = 10 then regexp_replace(n.digits, '(\d{2})(\d{4})(\d{4})', '(\1) \2-\3')
  else d.fone_fax
end
from normalized n
where d.id = n.id;
