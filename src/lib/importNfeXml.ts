import { NewDeliveryInput } from './deliveries';

export interface ParsedXmlFile {
  fileName: string;
  data: NewDeliveryInput | null;
  errors: string[];
}

// Sem biblioteca externa: DOMParser é nativo do navegador, sem risco de
// vulnerabilidade de dependência (mesmo motivo que evitamos o pacote xlsx).
function text(parent: Element | Document, tag: string): string {
  const el = parent.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() ?? '';
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCnpjCpf(rawDigits: string): string {
  const d = onlyDigits(rawDigits);
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return rawDigits;
}

function formatCep(rawDigits: string): string {
  const d = onlyDigits(rawDigits);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : rawDigits;
}

export async function parseNfeXmlFile(file: File): Promise<ParsedXmlFile> {
  const fileName = file.name;
  const xmlText = await file.text();

  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { fileName, data: null, errors: ['Arquivo não é um XML válido.'] };
  }

  const infNFe = doc.getElementsByTagName('infNFe')[0];
  const emit = doc.getElementsByTagName('emit')[0];
  const dest = doc.getElementsByTagName('dest')[0];
  const ide = doc.getElementsByTagName('ide')[0];

  if (!infNFe || !emit || !dest || !ide) {
    return { fileName, data: null, errors: ['Não parece ser um XML de NF-e (faltam as seções <ide>, <emit> ou <dest>).'] };
  }

  const errors: string[] = [];

  const nNF = text(ide, 'nNF');
  if (!nNF) errors.push('NF-e sem número (<nNF>).');

  const remetenteNome = text(emit, 'xNome');
  if (!remetenteNome) errors.push('Remetente sem nome (<emit><xNome>).');
  const remetenteCnpjRaw = text(emit, 'CNPJ') || text(emit, 'CPF');
  if (!remetenteCnpjRaw) errors.push('Remetente sem CNPJ/CPF (<emit><CNPJ> ou <CPF>).');

  const destNome = text(dest, 'xNome');
  if (!destNome) errors.push('Destinatário sem nome (<dest><xNome>).');
  const destCnpjRaw = text(dest, 'CNPJ') || text(dest, 'CPF');
  if (!destCnpjRaw) errors.push('Destinatário sem CNPJ/CPF (<dest><CNPJ> ou <CPF>).');

  const enderDest = dest.getElementsByTagName('enderDest')[0];
  const logradouro = enderDest ? text(enderDest, 'xLgr') : '';
  const numero = enderDest ? text(enderDest, 'nro') : '';
  const uf = enderDest ? text(enderDest, 'UF') : '';
  if (!logradouro) errors.push('Endereço do destinatário ausente (<dest><enderDest><xLgr>).');
  if (!uf) errors.push('UF do destinatário ausente (<dest><enderDest><UF>).');

  const dhEmi = text(ide, 'dhEmi') || text(ide, 'dEmi');
  const dataPedido = dhEmi ? dhEmi.slice(0, 10) : '';
  if (!dataPedido) errors.push('Data de emissão ausente (<ide><dhEmi> ou <dEmi>).');

  if (errors.length > 0) {
    return { fileName, data: null, errors };
  }

  const chNFe = infNFe.getAttribute('Id')?.replace(/^NFe/, '') || text(doc, 'chNFe');
  const vNF = text(doc, 'vNF');
  const infCpl = text(doc, 'infCpl');
  const foneDest = enderDest ? text(enderDest, 'fone') : '';

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const data: NewDeliveryInput = {
    codigo: `#HM-${randomSuffix}`,
    nfe: nNF,
    remetente: remetenteNome,
    remetenteCnpj: formatCnpjCpf(remetenteCnpjRaw),
    cliente: destNome,
    nomeRazaoSocial: destNome,
    cnpjCpf: formatCnpjCpf(destCnpjRaw),
    dataPedido,
    dataExpedicao: '',
    previsao: '',
    dataEntrega: '',
    enderecoCompleto: numero ? `${logradouro}, ${numero}` : logradouro,
    bairroDistrito: enderDest ? text(enderDest, 'xBairro') : '',
    cep: enderDest ? formatCep(text(enderDest, 'CEP')) : '',
    municipio: enderDest ? text(enderDest, 'xMun') : '',
    uf,
    foneFax: foneDest,
    status: 'EM ROTA',
    ocorrencia: infCpl || 'Nenhuma',
    valorCobranca: vNF ? Number(vNF) : 0,
    valorPagamento: 0,
    codigoRastreio: chNFe || '',
  };

  return { fileName, data, errors: [] };
}
