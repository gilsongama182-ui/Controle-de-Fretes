import { supabase } from './supabaseClient';

export type PartnerType = 'agregado' | 'parceiro';
export type PartnerStatus = 'ativo' | 'inativo';
export type HomologadoQualidade = '' | 'sim' | 'nao';

export interface Partner {
  id: string;
  tipo: PartnerType;
  nome: string;
  nomeFantasia: string;
  cpfCnpj: string;
  rg: string;
  inscricaoEstadual: string;
  telefone: string;
  email: string;
  responsavel: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: string;
  pix: string;
  // Específico de Agregado (veículo/motorista)
  veiculoPlaca: string;
  veiculoTipo: string;
  veiculoModelo: string;
  veiculoAno: string;
  veiculoRenavam: string;
  capacidadePesoKg: number;
  capacidadeVolumeM3: number;
  cnhNumero: string;
  cnhCategoria: string;
  cnhValidade: string;
  seguroApolice: string;
  seguroValidade: string;
  // Específico de Parceiro (empresa)
  segmento: string;
  regiaoAtuacao: string;
  dataInicioParceria: string;
  homologadoQualidade: HomologadoQualidade;
  // Controle
  status: PartnerStatus;
  observacoes: string;
  createdAt: string;
}

export type NewPartnerInput = Omit<Partner, 'id' | 'createdAt'>;

interface PartnerRow {
  id: string;
  tipo: PartnerType;
  nome: string;
  nome_fantasia: string | null;
  cpf_cnpj: string;
  rg: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  email: string | null;
  responsavel: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  pix: string | null;
  veiculo_placa: string | null;
  veiculo_tipo: string | null;
  veiculo_modelo: string | null;
  veiculo_ano: string | null;
  veiculo_renavam: string | null;
  capacidade_peso_kg: number | null;
  capacidade_volume_m3: number | null;
  cnh_numero: string | null;
  cnh_categoria: string | null;
  cnh_validade: string | null;
  seguro_apolice: string | null;
  seguro_validade: string | null;
  segmento: string | null;
  regiao_atuacao: string | null;
  data_inicio_parceria: string | null;
  homologado_qualidade: string | null;
  status: PartnerStatus;
  observacoes: string | null;
  created_at: string;
}

function fromRow(row: PartnerRow): Partner {
  return {
    id: row.id,
    tipo: row.tipo,
    nome: row.nome,
    nomeFantasia: row.nome_fantasia ?? '',
    cpfCnpj: row.cpf_cnpj,
    rg: row.rg ?? '',
    inscricaoEstadual: row.inscricao_estadual ?? '',
    telefone: row.telefone ?? '',
    email: row.email ?? '',
    responsavel: row.responsavel ?? '',
    cep: row.cep ?? '',
    endereco: row.endereco ?? '',
    numero: row.numero ?? '',
    complemento: row.complemento ?? '',
    bairro: row.bairro ?? '',
    municipio: row.municipio ?? '',
    uf: row.uf ?? '',
    banco: row.banco ?? '',
    agencia: row.agencia ?? '',
    conta: row.conta ?? '',
    tipoConta: row.tipo_conta ?? '',
    pix: row.pix ?? '',
    veiculoPlaca: row.veiculo_placa ?? '',
    veiculoTipo: row.veiculo_tipo ?? '',
    veiculoModelo: row.veiculo_modelo ?? '',
    veiculoAno: row.veiculo_ano ?? '',
    veiculoRenavam: row.veiculo_renavam ?? '',
    capacidadePesoKg: row.capacidade_peso_kg ?? 0,
    capacidadeVolumeM3: row.capacidade_volume_m3 ?? 0,
    cnhNumero: row.cnh_numero ?? '',
    cnhCategoria: row.cnh_categoria ?? '',
    cnhValidade: row.cnh_validade ?? '',
    seguroApolice: row.seguro_apolice ?? '',
    seguroValidade: row.seguro_validade ?? '',
    segmento: row.segmento ?? '',
    regiaoAtuacao: row.regiao_atuacao ?? '',
    dataInicioParceria: row.data_inicio_parceria ?? '',
    homologadoQualidade: (row.homologado_qualidade as HomologadoQualidade) ?? '',
    status: row.status,
    observacoes: row.observacoes ?? '',
    createdAt: row.created_at,
  };
}

function toRow(input: NewPartnerInput | Partial<Partner>) {
  const row: Record<string, unknown> = {};
  if (input.tipo !== undefined) row.tipo = input.tipo;
  if (input.nome !== undefined) row.nome = input.nome;
  if (input.nomeFantasia !== undefined) row.nome_fantasia = input.nomeFantasia || null;
  if (input.cpfCnpj !== undefined) row.cpf_cnpj = input.cpfCnpj;
  if (input.rg !== undefined) row.rg = input.rg || null;
  if (input.inscricaoEstadual !== undefined) row.inscricao_estadual = input.inscricaoEstadual || null;
  if (input.telefone !== undefined) row.telefone = input.telefone || null;
  if (input.email !== undefined) row.email = input.email || null;
  if (input.responsavel !== undefined) row.responsavel = input.responsavel || null;
  if (input.cep !== undefined) row.cep = input.cep || null;
  if (input.endereco !== undefined) row.endereco = input.endereco || null;
  if (input.numero !== undefined) row.numero = input.numero || null;
  if (input.complemento !== undefined) row.complemento = input.complemento || null;
  if (input.bairro !== undefined) row.bairro = input.bairro || null;
  if (input.municipio !== undefined) row.municipio = input.municipio || null;
  if (input.uf !== undefined) row.uf = input.uf || null;
  if (input.banco !== undefined) row.banco = input.banco || null;
  if (input.agencia !== undefined) row.agencia = input.agencia || null;
  if (input.conta !== undefined) row.conta = input.conta || null;
  if (input.tipoConta !== undefined) row.tipo_conta = input.tipoConta || null;
  if (input.pix !== undefined) row.pix = input.pix || null;
  if (input.veiculoPlaca !== undefined) row.veiculo_placa = input.veiculoPlaca || null;
  if (input.veiculoTipo !== undefined) row.veiculo_tipo = input.veiculoTipo || null;
  if (input.veiculoModelo !== undefined) row.veiculo_modelo = input.veiculoModelo || null;
  if (input.veiculoAno !== undefined) row.veiculo_ano = input.veiculoAno || null;
  if (input.veiculoRenavam !== undefined) row.veiculo_renavam = input.veiculoRenavam || null;
  if (input.capacidadePesoKg !== undefined) row.capacidade_peso_kg = input.capacidadePesoKg || null;
  if (input.capacidadeVolumeM3 !== undefined) row.capacidade_volume_m3 = input.capacidadeVolumeM3 || null;
  if (input.cnhNumero !== undefined) row.cnh_numero = input.cnhNumero || null;
  if (input.cnhCategoria !== undefined) row.cnh_categoria = input.cnhCategoria || null;
  if (input.cnhValidade !== undefined) row.cnh_validade = input.cnhValidade || null;
  if (input.seguroApolice !== undefined) row.seguro_apolice = input.seguroApolice || null;
  if (input.seguroValidade !== undefined) row.seguro_validade = input.seguroValidade || null;
  if (input.segmento !== undefined) row.segmento = input.segmento || null;
  if (input.regiaoAtuacao !== undefined) row.regiao_atuacao = input.regiaoAtuacao || null;
  if (input.dataInicioParceria !== undefined) row.data_inicio_parceria = input.dataInicioParceria || null;
  if (input.homologadoQualidade !== undefined) row.homologado_qualidade = input.homologadoQualidade || null;
  if (input.status !== undefined) row.status = input.status;
  if (input.observacoes !== undefined) row.observacoes = input.observacoes || null;
  return row;
}

export async function fetchPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as PartnerRow[]).map(fromRow);
}

export async function createPartner(input: NewPartnerInput): Promise<Partner> {
  const { data, error } = await supabase
    .from('partners')
    .insert(toRow(input))
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as PartnerRow);
}

export async function updatePartner(id: string, patch: Partial<Partner>): Promise<Partner> {
  const { data, error } = await supabase
    .from('partners')
    .update(toRow(patch))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as PartnerRow);
}

export async function deletePartner(id: string): Promise<void> {
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (error) throw error;
}
