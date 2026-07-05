import { Partner } from './partners';
import { formatDateBR } from './formatDate';
import { formatCpfCnpj } from './formatCpfCnpj';
import { formatPhoneBR } from './formatPhone';

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '');
  return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Mesmo truque usado pra chave de acesso NF-e/código de rastreio: força o
// Excel a tratar como texto, senão números com zero à esquerda (CPF, RG,
// Renavam etc.) perdem os zeros ou viram notação científica.
function asText(value: string): string {
  return value ? `="${value}"` : '';
}

function formatNumber(value: number): string {
  return value ? value.toFixed(2).replace('.', ',') : '';
}

const TIPO_LABEL: Record<Partner['tipo'], string> = { agregado: 'Agregado', parceiro: 'Parceiro' };
const STATUS_LABEL: Record<Partner['status'], string> = { ativo: 'Ativo', inativo: 'Inativo' };
const HOMOLOGADO_LABEL: Record<string, string> = { sim: 'Sim', nao: 'Não', '': '' };

const HEADERS = [
  'Tipo', 'Nome / Razão Social', 'Nome Fantasia', 'CPF / CNPJ', 'RG', 'Inscrição Estadual',
  'Telefone', 'E-mail', 'Responsável',
  'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Município', 'UF',
  'Banco', 'Agência', 'Conta', 'Tipo de Conta', 'PIX',
  'Placa', 'Tipo de Veículo', 'Modelo/Marca', 'Ano', 'Renavam', 'Capacidade (kg)', 'Capacidade (m³)',
  'CNH Número', 'CNH Categoria', 'CNH Validade', 'Seguro Apólice', 'Seguro Validade',
  'Segmento', 'Região de Atuação', 'Data Início Parceria', 'Homologado pela Qualidade',
  'Status', 'Observações', 'Data de Cadastro',
];

function partnerRow(p: Partner): string {
  const cells = [
    TIPO_LABEL[p.tipo],
    p.nome,
    p.nomeFantasia,
    asText(formatCpfCnpj(p.cpfCnpj)),
    asText(p.rg),
    p.inscricaoEstadual,
    formatPhoneBR(p.telefone),
    p.email,
    p.responsavel,
    p.cep,
    p.endereco,
    p.numero,
    p.complemento,
    p.bairro,
    p.municipio,
    p.uf,
    p.banco,
    asText(p.agencia),
    asText(p.conta),
    p.tipoConta,
    p.pix,
    p.veiculoPlaca,
    p.veiculoTipo,
    p.veiculoModelo,
    p.veiculoAno,
    asText(p.veiculoRenavam),
    formatNumber(p.capacidadePesoKg),
    formatNumber(p.capacidadeVolumeM3),
    asText(p.cnhNumero),
    p.cnhCategoria,
    formatDateBR(p.cnhValidade),
    asText(p.seguroApolice),
    formatDateBR(p.seguroValidade),
    p.segmento,
    p.regiaoAtuacao,
    formatDateBR(p.dataInicioParceria),
    HOMOLOGADO_LABEL[p.homologadoQualidade] ?? '',
    STATUS_LABEL[p.status],
    p.observacoes,
    formatDateBR(p.createdAt),
  ];
  return cells.map(escapeCsvValue).join(';');
}

// Separador ";" pelo mesmo motivo do relatório de entregas (lib/exportCsv.ts):
// o Excel em pt-BR usa vírgula como separador decimal.
export function exportPartnersToCsv(partners: Partner[], filename: string) {
  const rows = [HEADERS.join(';'), ...partners.map(partnerRow)];
  // BOM no início para o Excel reconhecer acentuação em UTF-8 corretamente.
  const csvContent = '﻿' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
