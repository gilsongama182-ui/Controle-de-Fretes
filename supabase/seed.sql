-- WLOGIS — dados de exemplo (opcional, fictícios)
-- Rode depois de schema.sql, no SQL Editor do painel Supabase.
--
-- Cada entrega tem um REMETENTE (quem contrata o frete — é esse CNPJ que
-- precisa bater com o documento da conta cliente) e um DESTINATÁRIO
-- (cliente/nome_razao_social/cnpj_cpf — quem recebe a carga).

insert into public.deliveries
  (codigo, nfe, remetente, remetente_cnpj, cliente, nome_razao_social, cnpj_cpf,
   data_pedido, data_expedicao, previsao,
   endereco_completo, bairro_distrito, cep, municipio, uf, fone_fax, status, ocorrencia,
   valor_cobranca, valor_pagamento, codigo_rastreio)
values
  ('#HM-1001', '200.001-01', 'Comércio Sul Distribuição', '50.100.200/0001-30', 'Fictícia Alpha', 'Fictícia Alpha Comércio LTDA', '11.111.111/0001-11',
   '2026-06-20', '2026-06-21', '2026-06-24', 'Rua das Amostras, 100', 'Centro', '01000-000',
   'São Paulo', 'SP', '(11) 4000-1001', 'ENTREGUE', 'Nenhuma', 1580.00, 1027.00, 'HB-FICT-1001'),

  ('#HM-1002', '200.002-02', 'Comércio Sul Distribuição', '50.100.200/0001-30', 'Beta Distribuidora', 'Beta Distribuidora de Produtos S.A.', '22.222.222/0001-22',
   '2026-06-22', '2026-06-23', '2026-06-27', 'Av. Central, 200', 'Barra', '22000-000',
   'Rio de Janeiro', 'RJ', '(21) 4000-1002', 'EM ROTA', 'Motorista a caminho do destino', 3200.00, 2080.00, 'HB-FICT-1002'),

  ('#HM-1003', '200.003-03', 'Comércio Sul Distribuição', '50.100.200/0001-30', 'Gama Indústria', 'Gama Indústria e Comércio LTDA', '33.333.333/0001-33',
   '2026-06-18', '2026-06-19', '2026-06-22', 'Rod. BR-040, Km 12', 'Distrito Industrial', '30000-000',
   'Belo Horizonte', 'MG', '(31) 4000-1003', 'EM ATRASO', 'Aguardando liberação na doca', 890.50, 578.00, 'HB-FICT-1003'),

  ('#HM-1004', '200.004-04', 'Exportadora Norte Brasil', '50.200.300/0001-40', 'Delta Varejo', 'Delta Varejo e Distribuição LTDA', '44.444.444/0001-44',
   '2026-06-15', '2026-06-16', 'Reagendado', 'Rua das Palmeiras, 45', 'Moinhos de Vento', '90000-000',
   'Porto Alegre', 'RS', '(51) 4000-1004', 'FALHA', 'Destinatário ausente no local', 420.00, 273.00, 'HB-FICT-1004'),

  ('#HM-1005', '200.005-05', 'Exportadora Norte Brasil', '50.200.300/0001-40', 'Épsilon Log', 'Épsilon Logística e Transportes LTDA', '55.555.555/0001-55',
   '2026-06-24', '2026-06-25', '2026-06-28', 'Av. das Torres, 900', 'Água Verde', '80000-000',
   'Curitiba', 'PR', '(41) 4000-1005', 'EM ROTA', 'Em trânsito interestadual', 5400.00, 3510.00, 'HB-FICT-1005'),

  ('#HM-1006', '200.006-06', 'Exportadora Norte Brasil', '50.200.300/0001-40', 'Zeta Alimentos', 'Zeta Alimentos e Bebidas S.A.', '66.666.666/0001-66',
   '2026-06-10', '2026-06-11', '2026-06-14', 'Rua Beira Mar, 12', 'Centro', '88000-000',
   'Florianópolis', 'SC', '(48) 4000-1006', 'ENTREGUE', 'Nenhuma', 1120.00, 728.00, 'HB-FICT-1006'),

  ('#HM-1007', '200.007-07', 'Indústria Central LTDA', '50.300.400/0001-50', 'Eta Construções', 'Eta Construções e Materiais LTDA', '77.777.777/0001-77',
   '2026-06-19', '2026-06-20', '2026-06-23', 'Av. Oceânica, 500', 'Barra Avenida', '40000-000',
   'Salvador', 'BA', '(71) 4000-1007', 'EM ATRASO', 'Veículo em manutenção', 2750.00, 1787.50, 'HB-FICT-1007'),

  ('#HM-1008', '200.008-08', 'Indústria Central LTDA', '50.300.400/0001-50', 'Theta Farma', 'Theta Produtos Farmacêuticos LTDA', '88.888.888/0001-88',
   '2026-06-25', '2026-06-26', '2026-06-29', 'Av. Djalma Batista, 800', 'Chapada', '69000-000',
   'Manaus', 'AM', '(92) 4000-1008', 'EM ROTA', 'Nenhuma', 960.00, 624.00, 'HB-FICT-1008'),

  ('#HM-1009', '200.009-09', 'Atacado Nacional S.A.', '50.400.500/0001-60', 'Iota Móveis', 'Iota Móveis e Decorações LTDA', '99.999.999/0001-99',
   '2026-06-12', '2026-06-13', '2026-06-16', 'Av. Goiás, 300', 'Setor Central', '74000-000',
   'Goiânia', 'GO', '(62) 4000-1009', 'ENTREGUE', 'Nenhuma', 1875.00, 1218.75, 'HB-FICT-1009'),

  ('#HM-1010', '200.010-10', 'Atacado Nacional S.A.', '50.400.500/0001-60', 'Capa Têxtil', 'Capa Têxtil do Nordeste S.A.', '10.101.010/0001-10',
   '2026-06-21', '2026-06-22', 'Endereço não localizado', 'Rua do Recife, 77', 'Boa Vista', '50000-000',
   'Recife', 'PE', '(81) 4000-1010', 'FALHA', 'Endereço não localizado', 530.00, 344.50, 'HB-FICT-1010')
on conflict (codigo) do nothing;

-- Dica: para que o dashboard do CLIENTE mostre alguma entrega de teste,
-- crie uma conta "cliente" cujo documento (CNPJ/CPF) bata com um dos
-- valores de remetente_cnpj acima, ex: 50.100.200/0001-30.
