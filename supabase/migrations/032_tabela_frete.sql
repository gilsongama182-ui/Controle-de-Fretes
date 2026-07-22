-- 032_tabela_frete.sql — tabela de frete (UF/tipo de tarifa/faixa de CEP x
-- faixa de peso) usada no cálculo automático da tela de Faturamento.
-- Leitura liberada pra operador/master (precisam ver a tabela ao calcular o
-- frete de uma entrega); escrita só master (erro aqui afeta o cálculo de
-- TODAS as entregas faturadas dali pra frente, não só um registro).

create table if not exists public.freight_rates (
  id uuid primary key default gen_random_uuid(),
  uf text not null,
  tipo_tarifa text not null check (tipo_tarifa in ('Capital', 'Interior')),
  cep_inicial text not null,
  cep_final text not null,
  valor_5kg numeric(10, 2) not null default 0,
  valor_10kg numeric(10, 2) not null default 0,
  valor_15kg numeric(10, 2) not null default 0,
  valor_20kg numeric(10, 2) not null default 0,
  valor_30kg numeric(10, 2) not null default 0,
  kg_adicional numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freight_rates_uf_idx on public.freight_rates (uf);

drop trigger if exists freight_rates_set_updated_at on public.freight_rates;
create trigger freight_rates_set_updated_at
  before update on public.freight_rates
  for each row execute function public.set_updated_at();

alter table public.freight_rates enable row level security;

drop policy if exists freight_rates_select on public.freight_rates;
create policy freight_rates_select
  on public.freight_rates
  for select
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() in ('operador', 'master')
  );

drop policy if exists freight_rates_insert on public.freight_rates;
create policy freight_rates_insert
  on public.freight_rates
  for insert
  with check (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'master'
  );

drop policy if exists freight_rates_update on public.freight_rates;
create policy freight_rates_update
  on public.freight_rates
  for update
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'master'
  );

drop policy if exists freight_rates_delete on public.freight_rates;
create policy freight_rates_delete
  on public.freight_rates
  for delete
  using (
    public.current_profile_status() = 'aprovado'
    and public.current_profile_type() = 'master'
  );

-- Seed inicial — tabela de frete anexada pelo usuário (58 linhas: 27 UFs,
-- cada uma com 1+ faixas de CEP por tipo de tarifa Capital/Interior).
insert into public.freight_rates
  (uf, tipo_tarifa, cep_inicial, cep_final, valor_5kg, valor_10kg, valor_15kg, valor_20kg, valor_30kg, kg_adicional)
values
  ('AC', 'Capital',  '69900-000', '69923-999',  89.50,  99.07, 120.81, 137.02, 164.82,  4.71),
  ('AC', 'Interior', '69924-000', '69999-999', 158.30, 189.40, 230.78, 297.61, 337.16, 12.33),
  ('AL', 'Capital',  '57000-000', '57099-999',  86.16,  97.65, 112.58, 138.43, 167.63,  2.75),
  ('AL', 'Interior', '57100-000', '57999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.32),
  ('AM', 'Capital',  '69000-000', '69099-999', 103.28, 122.05, 137.02, 151.99, 164.82, 10.44),
  ('AM', 'Interior', '69100-000', '69299-999', 158.30, 189.40, 230.78, 297.61, 337.16, 18.07),
  ('AM', 'Interior', '69400-000', '69899-999', 158.30, 189.40, 230.78, 297.61, 337.16, 18.07),
  ('AP', 'Capital',  '68900-000', '68914-999',  89.50,  99.07, 120.81, 137.02, 164.82,  4.71),
  ('AP', 'Interior', '68915-000', '68999-999', 158.30, 189.40, 230.78, 297.61, 337.16, 12.33),
  ('BA', 'Capital',  '40000-000', '44470-999',  86.16,  97.65, 112.58, 138.43, 167.63,  2.75),
  ('BA', 'Interior', '44471-000', '48999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.32),
  ('CE', 'Capital',  '60000-000', '61900-999',  97.65, 112.58, 131.25, 155.09, 171.63,  4.92),
  ('CE', 'Interior', '61901-000', '63999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  9.50),
  ('DF', 'Capital',  '70000-000', '70999-999',  91.90, 105.69, 113.73, 133.15, 138.74,  2.01),
  ('DF', 'Interior', '71000-000', '72799-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('DF', 'Interior', '73000-000', '73699-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('ES', 'Capital',  '29000-000', '29099-999',  74.67,  84.47, 111.97, 121.36, 133.98,  2.01),
  ('ES', 'Interior', '29100-000', '29999-999',  80.99, 101.70, 121.36, 159.28, 190.44,  5.07),
  ('GO', 'Capital',  '74000-000', '74899-999',  86.16, 105.69, 113.73, 133.15, 138.74,  2.01),
  ('GO', 'Interior', '72800-000', '72999-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('GO', 'Interior', '73700-000', '73999-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('GO', 'Interior', '74900-000', '76799-999', 110.28, 128.67, 141.35, 171.83, 184.74,  6.58),
  ('MA', 'Capital',  '65000-000', '65099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  2.93),
  ('MA', 'Interior', '65100-000', '65999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.50),
  ('MG', 'Capital',  '30000-000', '34999-999',  57.44,  72.99,  89.00, 109.87, 133.98,  1.28),
  ('MG', 'Interior', '35000-000', '39999-999',  80.42,  97.65, 111.02, 124.07, 141.07,  4.33),
  ('MS', 'Capital',  '79000-000', '79129-999', 101.09,  94.79, 118.07, 142.69, 177.74,  2.93),
  ('MS', 'Interior', '79130-000', '79999-999', 111.43, 132.11, 152.22, 172.32, 190.56,  7.50),
  ('MT', 'Capital',  '78000-000', '78109-999', 101.09, 103.53, 129.70, 155.86, 195.24,  3.29),
  ('MT', 'Interior', '78110-000', '78899-999', 111.43, 132.11, 152.22, 172.32, 190.56,  7.86),
  ('PA', 'Capital',  '66000-000', '67999-999',  80.99,  94.79, 118.07, 132.11, 152.10,  2.93),
  ('PA', 'Interior', '68000-000', '68899-999', 158.30, 189.40, 230.78, 297.61, 337.16, 10.56),
  ('PB', 'Capital',  '58000-000', '58099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  4.20),
  ('PB', 'Interior', '58100-000', '58999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  8.78),
  ('PE', 'Capital',  '50000-000', '54999-999',  97.65, 112.58, 131.25, 155.09, 171.63,  3.47),
  ('PE', 'Interior', '55000-000', '56999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  8.04),
  ('PI', 'Capital',  '64000-000', '64099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  2.93),
  ('PI', 'Interior', '64100-000', '64999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.50),
  ('PR', 'Capital',  '80000-000', '83800-999',  74.67,  85.01,  98.80, 114.13, 132.34,  1.28),
  ('PR', 'Interior', '83801-000', '87999-999',  91.90, 105.69, 138.78, 165.71, 195.63,  4.33),
  ('RJ', 'Capital',  '20000-000', '26600-999',  57.44,  72.99,  89.00, 109.87, 133.98,  1.28),
  ('RJ', 'Interior', '26601-000', '28999-999',  80.42,  97.65, 111.02, 124.07, 141.07,  4.33),
  ('RN', 'Capital',  '59000-000', '59099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  4.20),
  ('RN', 'Interior', '59100-000', '59999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  8.78),
  ('RO', 'Capital',  '76800-000', '76823-999',  89.50,  99.07, 120.81, 137.02, 164.82,  4.71),
  ('RO', 'Interior', '76824-000', '76999-999', 158.30, 189.40, 230.78, 297.61, 337.16, 12.33),
  ('RR', 'Capital',  '69300-000', '69339-999',  89.50,  99.07, 120.81, 137.02, 164.82, 36.80),
  ('RR', 'Interior', '69340-000', '69389-999', 160.83, 183.81, 235.68, 304.64, 351.36, 44.42),
  ('RS', 'Capital',  '90000-000', '94900-999',  74.67,  85.01,  98.80, 114.13, 132.34,  2.01),
  ('RS', 'Interior', '94901-000', '99999-999',  91.90, 105.69, 138.78, 165.71, 195.63,  5.07),
  ('SC', 'Capital',  '88000-000', '88469-999',  74.67,  85.01,  98.80, 114.13, 132.34,  1.28),
  ('SC', 'Interior', '88470-000', '89999-999',  91.90, 105.69, 138.78, 165.71, 195.63,  4.33),
  ('SE', 'Capital',  '49000-000', '49099-999',  97.65, 112.58, 131.25, 155.09, 171.63,  2.75),
  ('SE', 'Interior', '49100-000', '49999-999', 103.39, 124.07, 143.60, 165.43, 204.90,  7.32),
  ('SP', 'Capital',  '01000-000', '09999-999',  40.21,  51.70,  63.41,  80.42,  94.34,  1.01),
  ('SP', 'Interior', '11000-000', '19999-999',  86.16, 120.62, 138.62, 153.09, 174.45,  3.06),
  ('TO', 'Capital',  '77000-000', '77270-999', 103.39, 112.58, 143.60, 161.18, 189.07,  2.93),
  ('TO', 'Interior', '77300-000', '77995-999', 120.62, 129.81, 160.83, 183.69, 207.79,  7.50);
