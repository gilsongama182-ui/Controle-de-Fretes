-- Hemmersbach Logistics — dados de exemplo (opcional)
-- Rode depois de schema.sql, no SQL Editor do painel Supabase, se quiser
-- começar com os mesmos 10 registros que hoje existem em src/data.ts.

insert into public.deliveries
  (codigo, nfe, cliente, nome_razao_social, cnpj_cpf, data_pedido, data_expedicao, previsao,
   endereco_completo, bairro_distrito, cep, municipio, uf, fone_fax, status, ocorrencia,
   valor_cobranca, valor_pagamento, codigo_rastreio)
values
  ('#HM-9241', '112.983-01', 'Tech Global Solutions', 'Tech Global Solutions LTDA', '12.345.678/0001-90',
   '2024-05-20', '2024-05-22', '2024-05-20', 'Av. Paulista, 1000 - Andar 15', 'Bela Vista', '01310-100',
   'São Paulo', 'SP', '(11) 3456-7890', 'ENTREGUE', 'Nenhuma', 1250.00, 840.00, 'HB2024TX990'),

  ('#HM-9238', '112.982-05', 'Alpha Logística Ltda', 'Alpha Logística e Distribuição S.A.', '98.765.432/0001-21',
   '2024-05-18', '2024-05-19', '2024-05-18', 'Rua das Flores, 450', 'Centro', '80010-000',
   'Curitiba', 'PR', '(41) 3000-4000', 'EM ROTA', 'Motorista em trânsito', 4800.00, 3100.00, 'HB2024TX981'),

  ('#HM-9235', '112.981-12', 'Indústrias Metálicas S.A.', 'Indústrias Metálicas Brasileiras S.A.', '45.678.901/0001-33',
   '2024-05-17', '2024-05-17', '2024-05-17', 'Av. do Contorno, 4500', 'Savassi', '30110-017',
   'Belo Horizonte', 'MG', '(31) 3222-1111', 'EM ATRASO', 'Veículo quebrado', 950.40, 650.00, 'HB2024TX975'),

  ('#HM-9231', '112.980-44', 'Distribuidora Nortista', 'Distribuidora de Alimentos Nortista LTDA', '22.111.333/0001-77',
   '2024-05-15', '2024-05-16', '2024-05-22', 'Av. Djalma Batista, 1500', 'Flores', '69050-010',
   'Manaus', 'AM', '(92) 3555-8888', 'EM ROTA', 'Em trânsito interestadual', 3400.00, 2200.00, 'HB2024TX931'),

  ('#HM-9229', '112.979-99', 'Varejo Brasil', 'Varejo Geral do Brasil S.A.', '33.221.445/0001-08',
   '2024-05-12', '2024-05-14', 'Reagendado', 'Av. Rio Branco, 500', 'Centro', '20040-000',
   'Rio de Janeiro', 'RJ', '(21) 2345-6789', 'FALHA', 'Endereço não localizado', 850.00, 500.00, 'HB2024TX929'),

  ('#HM-29834', '112.983-01', 'TechMatrix Solutions', 'TechMatrix Solutions LTDA', '12.345.678/0001-90',
   '2024-10-10', '2024-10-12', '2024-10-15', 'Av. Paulista, 1000 - Andar 15', 'Bela Vista', '01310-100',
   'São Paulo', 'SP', '(11) 3456-7890', 'ENTREGUE', 'Nenhuma', 1250.00, 840.00, 'HB2024TX990'),

  ('#HM-30112', '112.982-05', 'Global Logistics SA', 'Global Logistics S.A.', '98.765.432/0001-21',
   '2024-10-11', '2024-10-13', '2024-10-16', 'Rua da Assembleia, 10 - Sala 202', 'Centro', '20011-000',
   'Rio de Janeiro', 'RJ', '(21) 2345-6789', 'EM ROTA', 'Motorista em trânsito', 4800.00, 0.00, 'HB2024TX981'),

  ('#HM-28990', '112.981-12', 'Inova Health Systems', 'Inova Health Systems S/S', '45.678.901/0001-33',
   '2024-10-08', '2024-10-10', '2024-10-14', 'Av. do Contorno, 4500', 'Savassi', '30110-017',
   'Belo Horizonte', 'MG', '(31) 3222-1111', 'EM ATRASO', 'Veículo quebrado', 950.40, 0.00, 'HB2024TX975'),

  ('#HM-30445', '112.980-11', 'Blue Horizon Retail', 'Blue Horizon Retail ME', '33.221.445/0001-08',
   '2024-10-12', '2024-10-14', '2024-10-16', 'Rua das Flores, 123', 'Jardim America', '01452-000',
   'São Paulo', 'SP', '(11) 98888-7777', 'FALHA', 'Endereço não localizado', 315.00, 0.00, 'HB2024TX929'),

  ('#HM-30556', '112.979-33', 'FastTrack Services', 'FastTrack Services Eireli', '22.111.333/0001-77',
   '2024-10-14', '2024-10-15', '2024-10-17', 'Av. Batel, 1500 - Bloco C', 'Batel', '80420-090',
   'Curitiba', 'PR', '(41) 3000-4000', 'EM ROTA', 'Nenhuma', 2100.00, 0.00, 'HB2024TX931')
on conflict (codigo) do nothing;

-- Dica: para que o dashboard do CLIENTE mostre alguma entrega de teste,
-- crie uma conta "cliente" cujo documento (CNPJ/CPF) bata com um dos
-- valores de cnpj_cpf acima, ex: 12.345.678/0001-90.
