import { Delivery } from '../types';
import { formatNfe } from './formatNfe';
import { DELIVERY_FIELDS } from './deliveryFields';

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '');
  return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function cellValue(delivery: Delivery, key: keyof Delivery): unknown {
  if (key === 'nfe') return formatNfe(delivery.nfe);
  return delivery[key];
}

// Separador ";" (não ",") porque o Excel em pt-BR usa vírgula como separador
// decimal e só quebra colunas automaticamente com ponto e vírgula. Os mesmos
// rótulos de coluna são usados na importação (lib/importCsv.ts), então um
// arquivo exportado pode ser editado e reimportado diretamente.
export function exportDeliveriesToCsv(
  deliveries: Delivery[],
  filename: string,
  excludeKeys: (keyof Delivery)[] = []
) {
  const headers = DELIVERY_FIELDS.filter((h) => !excludeKeys.includes(h.key));
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
