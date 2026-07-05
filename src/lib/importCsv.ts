import { Delivery, DeliveryStatus } from '../types';
import { NewDeliveryInput } from './deliveries';
import { DELIVERY_FIELDS, normalizeHeader } from './deliveryFields';

export interface ParsedRow {
  line: number; // linha no arquivo (1-based, contando o cabeçalho)
  data: NewDeliveryInput | null;
  errors: string[];
}

const VALID_STATUSES: DeliveryStatus[] = ['ENTREGUE', 'EM ROTA', 'EM ATRASO', 'FALHA'];

// Parser de CSV simples: separador é sempre ";" (mesmo que a exportação usa).
// Não usamos "," como separador porque campos como endereço frequentemente
// contêm vírgula (ex: "Rua Exemplo, 100") — usar "," quebraria essas colunas.
// Suporta campos entre aspas contendo ";" ou quebras de linha.
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ';') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else if (char === '\r') {
      // ignora, o \n seguinte fecha a linha
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// Aceita "YYYY-MM-DD" (formato já usado internamente) ou "DD/MM/AAAA"
// (formato exibido nas telas) e devolve sempre "YYYY-MM-DD".
function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return trimmed;
}

// Aceita tanto "1000.00" (formato usado na exportação/modelo) quanto
// "1.000,50" (formato brasileiro, se o usuário digitar direto no Excel).
// Só remove pontos como separador de milhar quando há vírgula decimal —
// senão "650.00" viraria 65000 em vez de 650.
function normalizeNumber(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const num = Number(normalized);
  return isNaN(num) ? 0 : num;
}

export function parseDeliveriesCsv(text: string): ParsedRow[] {
  const rows = parseCsvText(text.replace(/^﻿/, ''));
  if (rows.length === 0) return [];

  const headerRow = rows[0].map(normalizeHeader);
  const columnForField = new Map<string, number>();
  DELIVERY_FIELDS.forEach((f) => {
    const idx = headerRow.indexOf(normalizeHeader(f.label));
    if (idx !== -1) columnForField.set(f.key, idx);
  });

  const missingRequired = DELIVERY_FIELDS.filter((f) => f.required && !columnForField.has(f.key));
  if (missingRequired.length > 0) {
    return [{
      line: 1,
      data: null,
      errors: [`Colunas obrigatórias ausentes no cabeçalho: ${missingRequired.map((f) => f.label).join(', ')}`],
    }];
  }

  return rows.slice(1).map((cells, i) => {
    const errors: string[] = [];
    const get = (key: keyof Delivery): string => {
      const idx = columnForField.get(key);
      return idx !== undefined ? (cells[idx] ?? '').trim() : '';
    };

    DELIVERY_FIELDS.forEach((f) => {
      if (f.required && !get(f.key)) errors.push(`Campo obrigatório vazio: ${f.label}`);
    });

    const statusRaw = get('status').toUpperCase();
    const status = (VALID_STATUSES as string[]).includes(statusRaw) ? (statusRaw as DeliveryStatus) : 'EM ROTA';

    if (errors.length > 0) {
      return { line: i + 2, data: null, errors };
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const data: NewDeliveryInput = {
      codigo: get('codigo') || `#HM-${randomSuffix}`,
      nfe: get('nfe'),
      pedido: get('pedido'),
      remetente: get('remetente'),
      remetenteCnpj: get('remetenteCnpj'),
      remetenteEndereco: get('remetenteEndereco'),
      remetenteNumero: get('remetenteNumero'),
      remetenteComplemento: get('remetenteComplemento'),
      remetenteBairro: get('remetenteBairro'),
      remetenteCep: get('remetenteCep'),
      remetenteMunicipio: get('remetenteMunicipio'),
      remetenteUf: get('remetenteUf'),
      cliente: get('cliente'),
      nomeRazaoSocial: get('nomeRazaoSocial'),
      cnpjCpf: get('cnpjCpf'),
      dataPedido: normalizeDate(get('dataPedido')),
      dataExpedicao: get('dataExpedicao') ? normalizeDate(get('dataExpedicao')) : '',
      previsao: get('previsao') ? normalizeDate(get('previsao')) : '',
      dataEntrega: get('dataEntrega') ? normalizeDate(get('dataEntrega')) : '',
      enderecoCompleto: get('enderecoCompleto'),
      numero: get('numero'),
      complemento: get('complemento'),
      bairroDistrito: get('bairroDistrito'),
      cep: get('cep'),
      municipio: get('municipio'),
      uf: get('uf').toUpperCase(),
      foneFax: get('foneFax'),
      status,
      ocorrencia: get('ocorrencia'),
      atrasoResponsabilidade: 'proprio',
      falhaLidaEm: '',
      valorCobranca: get('valorCobranca') ? normalizeNumber(get('valorCobranca')) : 0,
      valorPagamento: get('valorPagamento') ? normalizeNumber(get('valorPagamento')) : 0,
      codigoRastreio: get('codigoRastreio'),
      chaveAcessoNfe: '',
      valorTotalNota: 0,
      comprovantePath: '',
      comprovanteNome: '',
      melhorEnvioId: '',
      melhorEnvioLastSyncAt: '',
    };

    return { line: i + 2, data, errors: [] };
  });
}

export function downloadCsvTemplate(filename: string) {
  const header = DELIVERY_FIELDS.map((f) => f.label).join(';');
  const example = DELIVERY_FIELDS.map((f) => {
    switch (f.key) {
      case 'codigo': return '';
      case 'nfe': return '112983-01';
      case 'pedido': return '6584799';
      case 'remetente': return 'Minha Empresa Ltda';
      case 'remetenteCnpj': return '11.111.111/0001-11';
      case 'remetenteEndereco': return 'Avenida Exemplo';
      case 'remetenteNumero': return '1000';
      case 'remetenteComplemento': return 'Sala 10';
      case 'remetenteBairro': return 'Centro';
      case 'remetenteCep': return '00000-000';
      case 'remetenteMunicipio': return 'São Paulo';
      case 'remetenteUf': return 'SP';
      case 'cliente': return 'Cliente Exemplo';
      case 'nomeRazaoSocial': return 'Cliente Exemplo Comércio LTDA';
      case 'cnpjCpf': return '22.222.222/0001-22';
      case 'dataPedido': return '2026-07-01';
      case 'dataExpedicao': return '2026-07-02';
      case 'previsao': return '2026-07-05';
      case 'dataEntrega': return '';
      case 'enderecoCompleto': return 'Rua Exemplo';
      case 'numero': return '100';
      case 'complemento': return 'Sala 2';
      case 'bairroDistrito': return 'Centro';
      case 'cep': return '00000-000';
      case 'municipio': return 'São Paulo';
      case 'uf': return 'SP';
      case 'foneFax': return '(11) 90000-0000';
      case 'status': return 'EM ROTA';
      case 'ocorrencia': return 'Nenhuma';
      case 'valorCobranca': return '1000.00';
      case 'valorPagamento': return '650.00';
      case 'codigoRastreio': return '';
      default: return '';
    }
  }).join(';');

  const csvContent = '﻿' + [header, example].join('\r\n');
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
