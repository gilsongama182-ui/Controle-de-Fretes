import { Delivery } from '../types';
import { formatNfe } from './formatNfe';
import { DELIVERY_FIELDS } from './deliveryFields';

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '');
  return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function cellValue(delivery: Delivery, key: keyof Delivery): unknown {
  if (key === 'nfe') return formatNfe(delivery.nfe);
  if (key === 'chaveAcessoNfe') {
    // ="..." força o Excel a tratar como texto — sem isso, um número de 44
    // dígitos vira notação científica e perde os zeros à esquerda.
    return delivery.chaveAcessoNfe ? `="${delivery.chaveAcessoNfe}"` : '';
  }
  if (key === 'valorTotalNota') {
    return delivery.valorTotalNota.toFixed(2).replace('.', ',');
  }
  if (key === 'valorPagamento') {
    return delivery.valorPagamento.toFixed(2).replace('.', ',');
  }
  if (key === 'codigoRastreio') {
    // Mesmo problema da chave de acesso: um código só com dígitos vira
    // notação científica no Excel se não for forçado como texto.
    return delivery.codigoRastreio ? `="${delivery.codigoRastreio}"` : '';
  }
  return delivery[key];
}

// Só aparecem no relatório exportado, não no template de importação (são
// preenchidos automaticamente pela importação de XML de NF-e, não digitados
// manualmente pelo usuário).
const EXPORT_ONLY_FIELDS: { key: keyof Delivery; label: string }[] = [
  { key: 'chaveAcessoNfe', label: 'Chave de Acesso NF-e' },
  { key: 'valorTotalNota', label: 'Valor Total da Nota' },
];

// Separador ";" (não ",") porque o Excel em pt-BR usa vírgula como separador
// decimal e só quebra colunas automaticamente com ponto e vírgula. Os mesmos
// rótulos de coluna são usados na importação (lib/importCsv.ts), então um
// arquivo exportado pode ser editado e reimportado diretamente.
export function exportDeliveriesToCsv(
  deliveries: Delivery[],
  filename: string,
  excludeKeys: (keyof Delivery)[] = []
) {
  const headers = [...DELIVERY_FIELDS, ...EXPORT_ONLY_FIELDS].filter((h) => !excludeKeys.includes(h.key));
  const rows = [
    headers.map((h) => h.label).join(';'),
    ...deliveries.map((d) => headers.map((h) => escapeCsvValue(cellValue(d, h.key))).join(';')),
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
