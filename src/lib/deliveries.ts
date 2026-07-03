import { supabase } from './supabaseClient';
import { Delivery, DeliveryStatus } from '../types';
import { formatNfe } from './formatNfe';

export type NewDeliveryInput = Omit<Delivery, 'id'>;

interface DeliveryRow {
  id: string;
  codigo: string;
  nfe: string;
  pedido: string | null;
  remetente: string | null;
  remetente_cnpj: string | null;
  cliente: string;
  nome_razao_social: string;
  cnpj_cpf: string;
  data_pedido: string;
  data_expedicao: string | null;
  previsao: string | null;
  data_entrega: string | null;
  endereco_completo: string;
  numero: string | null;
  complemento: string | null;
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
  chave_acesso_nfe: string | null;
  valor_total_nota: number | null;
  comprovante_path: string | null;
  comprovante_nome: string | null;
}

function fromRow(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    codigo: row.codigo,
    nfe: row.nfe,
    pedido: row.pedido ?? '',
    remetente: row.remetente ?? '',
    remetenteCnpj: row.remetente_cnpj ?? '',
    cliente: row.cliente,
    nomeRazaoSocial: row.nome_razao_social,
    cnpjCpf: row.cnpj_cpf,
    dataPedido: row.data_pedido,
    dataExpedicao: row.data_expedicao ?? '',
    previsao: row.previsao ?? '',
    dataEntrega: row.data_entrega ?? '',
    enderecoCompleto: row.endereco_completo,
    numero: row.numero ?? '',
    complemento: row.complemento ?? '',
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
    chaveAcessoNfe: row.chave_acesso_nfe ?? '',
    valorTotalNota: row.valor_total_nota ?? 0,
    comprovantePath: row.comprovante_path ?? '',
    comprovanteNome: row.comprovante_nome ?? '',
  };
}

// Deixa tudo em CAIXA ALTA pra visual consistente (o "codigo" e a "chave de
// acesso" ficam de fora, são identificadores técnicos, não texto livre).
const upper = (v: string) => v.toUpperCase();

function toRow(input: NewDeliveryInput | Partial<Delivery>) {
  const row: Record<string, unknown> = {};
  if (input.codigo !== undefined) row.codigo = input.codigo;
  if (input.nfe !== undefined) row.nfe = formatNfe(input.nfe);
  if (input.pedido !== undefined) row.pedido = upper(input.pedido);
  if (input.remetente !== undefined) row.remetente = upper(input.remetente);
  if (input.remetenteCnpj !== undefined) row.remetente_cnpj = upper(input.remetenteCnpj);
  if (input.cliente !== undefined) row.cliente = upper(input.cliente);
  if (input.nomeRazaoSocial !== undefined) row.nome_razao_social = upper(input.nomeRazaoSocial);
  if (input.cnpjCpf !== undefined) row.cnpj_cpf = upper(input.cnpjCpf);
  if (input.dataPedido !== undefined) row.data_pedido = input.dataPedido;
  if (input.dataExpedicao !== undefined) row.data_expedicao = input.dataExpedicao || null;
  if (input.previsao !== undefined) row.previsao = upper(input.previsao);
  if (input.dataEntrega !== undefined) row.data_entrega = input.dataEntrega || null;
  if (input.enderecoCompleto !== undefined) row.endereco_completo = upper(input.enderecoCompleto);
  if (input.numero !== undefined) row.numero = upper(input.numero);
  if (input.complemento !== undefined) row.complemento = upper(input.complemento);
  if (input.bairroDistrito !== undefined) row.bairro_distrito = upper(input.bairroDistrito);
  if (input.cep !== undefined) row.cep = input.cep;
  if (input.municipio !== undefined) row.municipio = upper(input.municipio);
  if (input.uf !== undefined) row.uf = upper(input.uf);
  if (input.foneFax !== undefined) row.fone_fax = input.foneFax;
  if (input.status !== undefined) row.status = input.status;
  if (input.ocorrencia !== undefined) row.ocorrencia = upper(input.ocorrencia);
  if (input.valorCobranca !== undefined) row.valor_cobranca = input.valorCobranca;
  if (input.valorPagamento !== undefined) row.valor_pagamento = input.valorPagamento;
  if (input.codigoRastreio !== undefined) row.codigo_rastreio = upper(input.codigoRastreio);
  if (input.chaveAcessoNfe !== undefined) row.chave_acesso_nfe = input.chaveAcessoNfe;
  if (input.valorTotalNota !== undefined) row.valor_total_nota = input.valorTotalNota;
  if (input.comprovantePath !== undefined) row.comprovante_path = input.comprovantePath || null;
  if (input.comprovanteNome !== undefined) row.comprovante_nome = input.comprovanteNome || null;
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

export async function createDeliveries(inputs: NewDeliveryInput[]): Promise<Delivery[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from('deliveries')
    .insert(inputs.map(toRow))
    .select('*');

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
