-- Formata "fone_fax" existente para "(XX) XXXXX-XXXX" (11 dígitos, celular)
-- ou "(XX) XXXX-XXXX" (10 dígitos, fixo). Números com outra quantidade de
-- dígitos ficam como estão. Rode este script no SQL Editor do Supabase.

update public.deliveries
set fone_fax = case
  when length(regexp_replace(fone_fax, '\D', '', 'g')) = 11
    then regexp_replace(regexp_replace(fone_fax, '\D', '', 'g'), '(\d{2})(\d{5})(\d{4})', '(\1) \2-\3')
  when length(regexp_replace(fone_fax, '\D', '', 'g')) = 10
    then regexp_replace(regexp_replace(fone_fax, '\D', '', 'g'), '(\d{2})(\d{4})(\d{4})', '(\1) \2-\3')
  else fone_fax
end
where fone_fax is not null;
