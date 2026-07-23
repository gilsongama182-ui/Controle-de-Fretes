import { supabase } from './supabaseClient';
import { AtrasoResponsabilidade, Delivery, DeliveryStatus } from '../types';
import { formatNfe } from './formatNfe';
import { formatPhoneBR } from './formatPhone';
import { TipoOcorrencia } from './deliveryOcorrencias';

// invoiceId/valorFreteCalculado/valorAcordado/reentrega ficam de fora — nascem
// vazios/false (default do banco) e só são preenchidos depois, pela tela de
// Faturamento.
export type NewDeliveryInput = Omit<Delivery, 'id' | 'updatedAt' | 'invoiceId' | 'valorFreteCalculado' | 'valorAcordado' | 'reentrega'>;

interface DeliveryRow {
  id: string;
  codigo: string;
  nfe: string;
  pedido: string | null;
  remetente: string | null;
  remetente_cnpj: string | null;
  remetente_endereco: string | null;
  remetente_numero: string | null;
  remetente_complemento: string | null;
  remetente_bairro: string | null;
  remetente_cep: string | null;
  remetente_municipio: string | null;
  remetente_uf: string | null;
  cliente: string;
  nome_razao_social: string;
  cnpj_cpf: string;
  data_pedido: string;
  data_expedicao: string | null;
  previsao: string | null;
  data_entrega: string | null;
  nome_recebedor: string | null;
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
  atraso_responsabilidade: AtrasoResponsabilidade;
  falha_lida_em: string | null;
  valor_cobranca: number;
  valor_pagamento: number;
  codigo_rastreio: string | null;
  chave_acesso_nfe: string | null;
  valor_total_nota: number | null;
  melhor_envio_id: string | null;
  melhor_envio_last_sync_at: string | null;
  loggi_last_sync_at: string | null;
  motorista_id: string | null;
  motorista_nome: string | null;
  invoice_id: string | null;
  valor_frete_calculado: number | null;
  valor_acordado: number | null;
  reentrega: boolean;
  updated_at: string;
}

function fromRow(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    codigo: row.codigo,
    nfe: row.nfe,
    pedido: row.pedido ?? '',
    remetente: row.remetente ?? '',
    remetenteCnpj: row.remetente_cnpj ?? '',
    remetenteEndereco: row.remetente_endereco ?? '',
    remetenteNumero: row.remetente_numero ?? '',
    remetenteComplemento: row.remetente_complemento ?? '',
    remetenteBairro: row.remetente_bairro ?? '',
    remetenteCep: row.remetente_cep ?? '',
    remetenteMunicipio: row.remetente_municipio ?? '',
    remetenteUf: row.remetente_uf ?? '',
    cliente: row.cliente,
    nomeRazaoSocial: row.nome_razao_social,
    cnpjCpf: row.cnpj_cpf,
    dataPedido: row.data_pedido,
    dataExpedicao: row.data_expedicao ?? '',
    previsao: row.previsao ?? '',
    dataEntrega: row.data_entrega ?? '',
    nomeRecebedor: row.nome_recebedor ?? '',
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
    atrasoResponsabilidade: row.atraso_responsabilidade ?? 'proprio',
    falhaLidaEm: row.falha_lida_em ?? '',
    valorCobranca: row.valor_cobranca,
    valorPagamento: row.valor_pagamento,
    codigoRastreio: row.codigo_rastreio ?? '',
    chaveAcessoNfe: row.chave_acesso_nfe ?? '',
    valorTotalNota: row.valor_total_nota ?? 0,
    melhorEnvioId: row.melhor_envio_id ?? '',
    melhorEnvioLastSyncAt: row.melhor_envio_last_sync_at ?? '',
    loggiLastSyncAt: row.loggi_last_sync_at ?? '',
    motoristaId: row.motorista_id ?? '',
    motoristaNome: row.motorista_nome ?? '',
    invoiceId: row.invoice_id ?? '',
    valorFreteCalculado: row.valor_frete_calculado,
    valorAcordado: row.valor_acordado,
    reentrega: row.reentrega,
    updatedAt: row.updated_at,
  };
}

// Deixa tudo em CAIXA ALTA pra visual consistente (o "codigo" e a "chave de
// acesso" ficam de fora, são identificadores técnicos, não texto livre).
const upper = (v: string) => v.toUpperCase();

function toRow(input: NewDeliveryInput | Partial<Delivery>) {
  const row: Record<string, unknown> = {};
  if (input.codigo !== undefined) row.codigo = input.codigo;
  if (input.nfe !== undefined) row.nfe = formatNfe(input.nfe);
  // Pedido é sempre numérico (7 dígitos) — sem espaço nem ponto.
  if (input.pedido !== undefined) row.pedido = input.pedido.replace(/\D/g, '');
  if (input.remetente !== undefined) row.remetente = upper(input.remetente);
  if (input.remetenteCnpj !== undefined) row.remetente_cnpj = upper(input.remetenteCnpj);
  if (input.remetenteEndereco !== undefined) row.remetente_endereco = upper(input.remetenteEndereco);
  if (input.remetenteNumero !== undefined) row.remetente_numero = upper(input.remetenteNumero);
  if (input.remetenteComplemento !== undefined) row.remetente_complemento = upper(input.remetenteComplemento);
  if (input.remetenteBairro !== undefined) row.remetente_bairro = upper(input.remetenteBairro);
  if (input.remetenteCep !== undefined) row.remetente_cep = input.remetenteCep;
  if (input.remetenteMunicipio !== undefined) row.remetente_municipio = upper(input.remetenteMunicipio);
  if (input.remetenteUf !== undefined) row.remetente_uf = upper(input.remetenteUf);
  if (input.cliente !== undefined) row.cliente = upper(input.cliente);
  if (input.nomeRazaoSocial !== undefined) row.nome_razao_social = upper(input.nomeRazaoSocial);
  if (input.cnpjCpf !== undefined) row.cnpj_cpf = upper(input.cnpjCpf);
  if (input.dataPedido !== undefined) row.data_pedido = input.dataPedido;
  if (input.dataExpedicao !== undefined) row.data_expedicao = input.dataExpedicao || null;
  if (input.previsao !== undefined) row.previsao = upper(input.previsao);
  if (input.dataEntrega !== undefined) row.data_entrega = input.dataEntrega || null;
  if (input.nomeRecebedor !== undefined) row.nome_recebedor = upper(input.nomeRecebedor) || null;
  if (input.enderecoCompleto !== undefined) row.endereco_completo = upper(input.enderecoCompleto);
  if (input.numero !== undefined) row.numero = upper(input.numero);
  if (input.complemento !== undefined) row.complemento = upper(input.complemento);
  if (input.bairroDistrito !== undefined) row.bairro_distrito = upper(input.bairroDistrito);
  if (input.cep !== undefined) row.cep = input.cep;
  if (input.municipio !== undefined) row.municipio = upper(input.municipio);
  if (input.uf !== undefined) row.uf = upper(input.uf);
  if (input.foneFax !== undefined) row.fone_fax = formatPhoneBR(input.foneFax);
  if (input.status !== undefined) row.status = input.status;
  if (input.ocorrencia !== undefined) row.ocorrencia = upper(input.ocorrencia);
  if (input.atrasoResponsabilidade !== undefined) row.atraso_responsabilidade = input.atrasoResponsabilidade;
  if (input.falhaLidaEm !== undefined) row.falha_lida_em = input.falhaLidaEm || null;
  if (input.valorCobranca !== undefined) row.valor_cobranca = input.valorCobranca;
  if (input.valorPagamento !== undefined) row.valor_pagamento = input.valorPagamento;
  if (input.codigoRastreio !== undefined) row.codigo_rastreio = upper(input.codigoRastreio);
  if (input.chaveAcessoNfe !== undefined) row.chave_acesso_nfe = input.chaveAcessoNfe;
  if (input.valorTotalNota !== undefined) row.valor_total_nota = input.valorTotalNota;
  if (input.melhorEnvioId !== undefined) row.melhor_envio_id = input.melhorEnvioId || null;
  if (input.melhorEnvioLastSyncAt !== undefined) row.melhor_envio_last_sync_at = input.melhorEnvioLastSyncAt || null;
  if (input.loggiLastSyncAt !== undefined) row.loggi_last_sync_at = input.loggiLastSyncAt || null;
  if (input.motoristaId !== undefined) row.motorista_id = input.motoristaId || null;
  if (input.motoristaNome !== undefined) row.motorista_nome = upper(input.motoristaNome) || null;
  if ('valorFreteCalculado' in input && input.valorFreteCalculado !== undefined) {
    row.valor_frete_calculado = input.valorFreteCalculado;
  }
  if ('valorAcordado' in input && input.valorAcordado !== undefined) {
    row.valor_acordado = input.valorAcordado;
  }
  if ('reentrega' in input && input.reentrega !== undefined) {
    row.reentrega = input.reentrega;
  }
  // invoiceId de propósito NÃO entra aqui — só as RPCs criar_fatura/remover_fatura
  // (lib/invoices.ts) podem vincular/desvincular uma entrega de uma fatura,
  // pra manter a garantia atômica de "uma fatura por vez" (invoice_id is null).
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

// Rebusca só um conjunto de entregas pelo id — usado depois de uma
// sincronização de rastreio (a função serverless atualiza direto no banco;
// isso aqui traz o resultado já mapeado pra atualizar o estado local).
export async function fetchDeliveriesByIds(ids: string[]): Promise<Delivery[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('deliveries').select('*').in('id', ids);
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

// Marca uma FALHA como lida no sino de notificações do cliente — via RPC
// (não um update comum) porque o cliente não tem policy de UPDATE em
// deliveries; a função valida o CNPJ internamente e grava só essa coluna.
export async function marcarFalhaLida(id: string): Promise<Delivery> {
  const { data, error } = await supabase.rpc('marcar_falha_lida', { p_delivery_id: id });
  if (error) throw error;
  return fromRow(data as DeliveryRow);
}

export async function deleteDelivery(id: string): Promise<void> {
  const { error } = await supabase.from('deliveries').delete().eq('id', id);
  if (error) throw error;
}

// Atribuição de motorista em lote (tela de Gestão de Entregas, seleção
// múltipla) — um único update em vez de N chamadas. motoristaId null
// desatribui (limpa o campo de volta).
export async function assignMotorista(ids: string[], motoristaId: string | null, motoristaNome: string): Promise<Delivery[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('deliveries')
    .update({ motorista_id: motoristaId, motorista_nome: motoristaId ? motoristaNome.toUpperCase() : null })
    .in('id', ids)
    .select('*');

  if (error) throw error;
  return (data as DeliveryRow[]).map(fromRow);
}

// Baixa de entrega pelo motorista (tela mobile) — via RPC, não update direto:
// o papel motorista não tem policy de UPDATE em deliveries (só operador/master
// têm), então só essas colunas específicas podem ser alteradas, e só na
// entrega que estiver atribuída a ele (validado dentro da função no banco).
export interface BaixarEntregaInput {
  status: Extract<DeliveryStatus, 'ENTREGUE' | 'FALHA' | 'DEVOLVIDO'>;
  ocorrencia: string;
  nomeRecebedor: string;
  dataEntrega: string;
  tipoOcorrencia?: TipoOcorrencia;
  dataOcorrencia?: string;
}

export async function baixarEntregaMotorista(id: string, input: BaixarEntregaInput): Promise<Delivery> {
  const { data, error } = await supabase.rpc('motorista_baixar_entrega', {
    p_delivery_id: id,
    p_status: input.status,
    p_ocorrencia: input.ocorrencia || null,
    p_nome_recebedor: input.nomeRecebedor || null,
    p_data_entrega: input.dataEntrega || null,
    p_tipo_ocorrencia: input.tipoOcorrencia || null,
    p_data_ocorrencia: input.dataOcorrencia || null,
  });

  if (error) throw error;
  return fromRow(data as DeliveryRow);
}
