import { supabase } from './supabaseClient';
import { Delivery, DeliveryStatus } from '../types';

export type NewDeliveryInput = Omit<Delivery, 'id'>;

interface DeliveryRow {
  id: string;
  codigo: string;
  nfe: string;
  cliente: string;
  nome_razao_social: string;
  cnpj_cpf: string;
  data_pedido: string;
  data_expedicao: string | null;
  previsao: string | null;
  endereco_completo: string;
  bairro_distrito: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string;
  fone_fax: string | null;
  status: DeliveryStatus;
  ocorrencia: string | null;
  valor_cobranca: number;
  valor_pagamento: number;
  codigo_rastreio: string | null;
}

function fromRow(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    codigo: row.codigo,
    nfe: row.nfe,
    cliente: row.cliente,
    nomeRazaoSocial: row.nome_razao_social,
    cnpjCpf: row.cnpj_cpf,
    dataPedido: row.data_pedido,
    dataExpedicao: row.data_expedicao ?? '',
    previsao: row.previsao ?? '',
    enderecoCompleto: row.endereco_completo,
    bairroDistrito: row.bairro_distrito ?? '',
    cep: row.cep ?? '',
    municipio: row.municipio ?? '',
    uf: row.uf,
    foneFax: row.fone_fax ?? '',
    status: row.status,
    ocorrencia: row.ocorrencia ?? '',
    valorCobranca: row.valor_cobranca,
    valorPagamento: row.valor_pagamento,
    codigoRastreio: row.codigo_rastreio ?? '',
  };
}

function toRow(input: NewDeliveryInput | Partial<Delivery>) {
  const row: Record<string, unknown> = {};
  if (input.codigo !== undefined) row.codigo = input.codigo;
  if (input.nfe !== undefined) row.nfe = input.nfe;
  if (input.cliente !== undefined) row.cliente = input.cliente;
  if (input.nomeRazaoSocial !== undefined) row.nome_razao_social = input.nomeRazaoSocial;
  if (input.cnpjCpf !== undefined) row.cnpj_cpf = input.cnpjCpf;
  if (input.dataPedido !== undefined) row.data_pedido = input.dataPedido;
  if (input.dataExpedicao !== undefined) row.data_expedicao = input.dataExpedicao || null;
  if (input.previsao !== undefined) row.previsao = input.previsao;
  if (input.enderecoCompleto !== undefined) row.endereco_completo = input.enderecoCompleto;
  if (input.bairroDistrito !== undefined) row.bairro_distrito = input.bairroDistrito;
  if (input.cep !== undefined) row.cep = input.cep;
  if (input.municipio !== undefined) row.municipio = input.municipio;
  if (input.uf !== undefined) row.uf = input.uf;
  if (input.foneFax !== undefined) row.fone_fax = input.foneFax;
  if (input.status !== undefined) row.status = input.status;
  if (input.ocorrencia !== undefined) row.ocorrencia = input.ocorrencia;
  if (input.valorCobranca !== undefined) row.valor_cobranca = input.valorCobranca;
  if (input.valorPagamento !== undefined) row.valor_pagamento = input.valorPagamento;
  if (input.codigoRastreio !== undefined) row.codigo_rastreio = input.codigoRastreio;
  return row;
}

export async function fetchDeliveries(): Promise<Delivery[]> {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DeliveryRow[]).map(fromRow);
}

export async function createDelivery(input: NewDeliveryInput): Promise<Delivery> {
  const { data, error } = await supabase
    .from('deliveries')
    .insert(toRow(input))
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as DeliveryRow);
}

export async function updateDelivery(id: string, patch: Partial<Delivery>): Promise<Delivery> {
  const { data, error } = await supabase
    .from('deliveries')
    .update(toRow(patch))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as DeliveryRow);
}

export async function deleteDelivery(id: string): Promise<void> {
  const { error } = await supabase.from('deliveries').delete().eq('id', id);
  if (error) throw error;
}
