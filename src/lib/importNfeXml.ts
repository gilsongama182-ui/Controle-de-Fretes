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

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export async function parseNfeXmlFile(file: File): Promise<ParsedXmlFile> {
  const fileName = file.name;
  const xmlText = await file.text();

  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { fileName, data: null, errors: ['Arquivo não é um XML válido.'] };
  }

  const emit = doc.getElementsByTagName('emit')[0];
  // Destinatário: NF-e padrão usa <dest>; aceitamos <entrega> também, caso o
  // XML de origem use esse nome.
  const destino = doc.getElementsByTagName('dest')[0] ?? doc.getElementsByTagName('entrega')[0];

  if (!emit || !destino) {
    return { fileName, data: null, errors: ['Não parece ser um XML de NF-e (faltam as seções <emit> ou <dest>/<entrega>).'] };
  }

  const errors: string[] = [];

  const nNF = text(doc.getElementsByTagName('ide')[0] ?? doc, 'nNF');
  if (!nNF) errors.push('NF-e sem número (<nNF>).');

  const remetenteNome = text(emit, 'xNome');
  if (!remetenteNome) errors.push('Remetente sem nome (<emit><xNome>).');
  const remetenteCnpjRaw = text(emit, 'CNPJ') || text(emit, 'CPF');
  if (!remetenteCnpjRaw) errors.push('Remetente sem CNPJ (<emit><CNPJ>).');

  const destNome = text(destino, 'xNome');
  if (!destNome) errors.push('Destinatário sem nome (<xNome>).');
  // Nesse layout o destinatário normalmente vem como CPF; aceitamos CNPJ também.
  const destCnpjCpfRaw = text(destino, 'CPF') || text(destino, 'CNPJ');
  if (!destCnpjCpfRaw) errors.push('Destinatário sem CPF/CNPJ.');

  // Endereço do destinatário: pode estar direto em <dest>/<entrega> ou dentro
  // de <enderDest> (variação mais comum do layout padrão da NF-e).
  const enderDest = destino.getElementsByTagName('enderDest')[0] ?? destino;
  const logradouro = text(enderDest, 'xLgr');
  const numero = text(enderDest, 'nro');
  const complemento = text(enderDest, 'xCpl');
  const uf = text(enderDest, 'UF');
  if (!logradouro) errors.push('Endereço ausente (<xLgr>).');
  if (!uf) errors.push('UF ausente (<UF>).');

  if (errors.length > 0) {
    return { fileName, data: null, errors };
  }

  const chNFe = doc.getElementsByTagName('infNFe')[0]?.getAttribute('Id')?.replace(/^NFe/, '') || text(doc, 'chNFe');
  const vNF = text(doc, 'vNF');
  const pedido = text(doc.getElementsByTagName('infAdic')[0] ?? doc, 'infCpl');

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const data: NewDeliveryInput = {
    codigo: `#HM-${randomSuffix}`,
    nfe: nNF,
    pedido,
    remetente: remetenteNome,
    remetenteCnpj: formatCnpjCpf(remetenteCnpjRaw),
    cliente: destNome,
    nomeRazaoSocial: destNome,
    cnpjCpf: formatCnpjCpf(destCnpjCpfRaw),
    dataPedido: todayIso(), // data do pedido = dia da importação, não a data de emissão da NF-e
    dataExpedicao: '',
    previsao: '',
    dataEntrega: '',
    enderecoCompleto: logradouro,
    numero,
    complemento,
    bairroDistrito: text(enderDest, 'xBairro'),
    cep: formatCep(text(enderDest, 'CEP')),
    municipio: text(enderDest, 'xMun'),
    uf,
    foneFax: text(enderDest, 'fone'),
    status: 'EM ROTA',
    ocorrencia: 'Nenhuma',
    valorCobranca: 0,
    valorPagamento: 0,
    codigoRastreio: '',
    chaveAcessoNfe: chNFe || '',
    valorTotalNota: vNF ? Number(vNF) : 0,
  };

  return { fileName, data, errors: [] };
}
