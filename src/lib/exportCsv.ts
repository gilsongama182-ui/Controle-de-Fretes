import { Delivery } from '../types';

const HEADERS: { key: keyof Delivery; label: string }[] = [
  { key: 'codigo', label: 'Código' },
  { key: 'nfe', label: 'NF-e' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'nomeRazaoSocial', label: 'Nome / Razão Social' },
  { key: 'cnpjCpf', label: 'CNPJ / CPF' },
  { key: 'dataPedido', label: 'Data do Pedido' },
  { key: 'dataExpedicao', label: 'Data de Expedição' },
  { key: 'previsao', label: 'Previsão' },
  { key: 'enderecoCompleto', label: 'Endereço' },
  { key: 'bairroDistrito', label: 'Bairro / Distrito' },
  { key: 'cep', label: 'CEP' },
  { key: 'municipio', label: 'Município' },
  { key: 'uf', label: 'UF' },
  { key: 'foneFax', label: 'Fone / Fax' },
  { key: 'status', label: 'Status' },
  { key: 'ocorrencia', label: 'Ocorrência' },
  { key: 'valorCobranca', label: 'Valor Cobrança' },
  { key: 'valorPagamento', label: 'Valor Pagamento' },
  { key: 'codigoRastreio', label: 'Código de Rastreio' },
];

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '');
  return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Separador ";" (não ",") porque o Excel em pt-BR usa vírgula como separador
// decimal e só quebra colunas automaticamente com ponto e vírgula.
export function exportDeliveriesToCsv(deliveries: Delivery[], filename: string) {
  const rows = [
    HEADERS.map((h) => h.label).join(';'),
    ...deliveries.map((d) => HEADERS.map((h) => escapeCsvValue(d[h.key])).join(';')),
  ];
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
