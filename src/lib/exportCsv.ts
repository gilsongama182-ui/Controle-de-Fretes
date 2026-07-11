import { Delivery } from '../types';
import { formatNfe } from './formatNfe';
import { formatDateBR } from './formatDate';
import { DELIVERY_FIELDS } from './deliveryFields';
import { Volume } from './deliveryVolumes';
import { DeliveryComprovante } from './comprovantes';
import { DeliveryOcorrencia } from './deliveryOcorrencias';
import { isForaDoPrazoBruto } from './deliveryStatus';

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
  if (key === 'atrasoResponsabilidade') {
    // Só faz sentido informar responsável quando a entrega realmente saiu do
    // prazo — sem isso, fica em branco (não é "PRÓPRIO" por padrão).
    if (!isForaDoPrazoBruto(delivery)) return '';
    return delivery.atrasoResponsabilidade === 'cliente' ? 'CLIENTE' : 'PRÓPRIO';
  }
  return delivery[key];
}

// Só aparecem no relatório exportado, não no template de importação (são
// preenchidos automaticamente pela importação de XML de NF-e, não digitados
// manualmente pelo usuário).
const EXPORT_ONLY_FIELDS: { key: keyof Delivery; label: string }[] = [
  { key: 'chaveAcessoNfe', label: 'Chave de Acesso NF-e' },
  { key: 'valorTotalNota', label: 'Valor Total da Nota' },
  { key: 'atrasoResponsabilidade', label: 'Responsável pelo Atraso' },
];

// Colunas de cubagem (peso/altura/largura/comprimento) não são um campo de
// Delivery — vêm de uma tabela separada (1 entrega : N volumes) — por isso
// entram à parte, não por DELIVERY_FIELDS/excludeKeys. Só aparecem quando o
// chamador passa o mapa de volumes; a exportação do cliente nunca passa esse
// mapa, então essas colunas nunca aparecem pra esse perfil.
const VOLUME_HEADERS = ['Qtd Volumes', 'Peso (kg)', 'Altura (cm)', 'Largura (cm)', 'Comprimento (cm)'];

function formatVolumeColumn(volumes: Volume[], pick: (v: Volume) => number): string {
  return volumes.map((v) => pick(v).toFixed(2).replace('.', ',')).join(' | ');
}

// A coluna de ocorrência registrada no relatório sempre reflete a mais
// recente (por data da ocorrência) — o histórico completo fica só na tela de
// edição, não no CSV.
function formatUltimaOcorrenciaRegistrada(ocorrencias: DeliveryOcorrencia[]): string {
  if (ocorrencias.length === 0) return '';
  const ultima = [...ocorrencias].sort((a, b) => b.dataOcorrencia.localeCompare(a.dataOcorrencia))[0];
  return `${ultima.tipo} (${formatDateBR(ultima.dataOcorrencia)})`;
}

// Separador ";" (não ",") porque o Excel em pt-BR usa vírgula como separador
// decimal e só quebra colunas automaticamente com ponto e vírgula. Os mesmos
// rótulos de coluna são usados na importação (lib/importCsv.ts), então um
// arquivo exportado pode ser editado e reimportado diretamente.
export function exportDeliveriesToCsv(
  deliveries: Delivery[],
  filename: string,
  excludeKeys: (keyof Delivery)[] = [],
  volumesByDeliveryId?: Map<string, Volume[]>,
  // Só passado pelos relatórios internos (gestão/operador) — o relatório do
  // cliente nunca informa esse mapa, então a coluna nunca aparece pra esse perfil.
  comprovantesByDeliveryId?: Map<string, DeliveryComprovante[]>,
  ocorrenciasByDeliveryId?: Map<string, DeliveryOcorrencia[]>
) {
  const headers = [...DELIVERY_FIELDS, ...EXPORT_ONLY_FIELDS].filter((h) => !excludeKeys.includes(h.key));
  const extraHeaders = [
    ...(volumesByDeliveryId ? VOLUME_HEADERS : []),
    ...(comprovantesByDeliveryId ? ['Possui Anexo'] : []),
    ...(ocorrenciasByDeliveryId ? ['Última Ocorrência Registrada'] : []),
  ];
  const headerRow = [...headers.map((h) => h.label), ...extraHeaders].join(';');
  const rows = [
    headerRow,
    ...deliveries.map((d) => {
      const cells = headers.map((h) => escapeCsvValue(cellValue(d, h.key)));
      if (volumesByDeliveryId) {
        const volumes = volumesByDeliveryId.get(d.id) ?? [];
        cells.push(
          String(volumes.length),
          escapeCsvValue(formatVolumeColumn(volumes, (v) => v.peso)),
          escapeCsvValue(formatVolumeColumn(volumes, (v) => v.altura)),
          escapeCsvValue(formatVolumeColumn(volumes, (v) => v.largura)),
          escapeCsvValue(formatVolumeColumn(volumes, (v) => v.comprimento))
        );
      }
      if (comprovantesByDeliveryId) {
        const temAnexo = (comprovantesByDeliveryId.get(d.id)?.length ?? 0) > 0;
        cells.push(temAnexo ? 'Sim' : 'Não');
      }
      if (ocorrenciasByDeliveryId) {
        cells.push(escapeCsvValue(formatUltimaOcorrenciaRegistrada(ocorrenciasByDeliveryId.get(d.id) ?? [])));
      }
      return cells.join(';');
    }),
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
