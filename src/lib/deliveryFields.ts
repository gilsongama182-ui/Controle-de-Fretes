import { Delivery } from '../types';

// Lista única de campos usada tanto na exportação quanto na importação de CSV,
// para garantir que o arquivo exportado sirva como modelo de reimportação.
export const DELIVERY_FIELDS: { key: keyof Delivery; label: string; required: boolean }[] = [
  { key: 'codigo', label: 'Código', required: false }, // gerado automaticamente se vazio
  { key: 'nfe', label: 'NF-e', required: true },
  { key: 'pedido', label: 'Pedido', required: false },
  { key: 'remetente', label: 'Remetente', required: true },
  { key: 'remetenteCnpj', label: 'CNPJ Remetente', required: true },
  { key: 'remetenteEndereco', label: 'Endereço Remetente', required: false },
  { key: 'remetenteNumero', label: 'Nº Remetente', required: false },
  { key: 'remetenteComplemento', label: 'Complemento Remetente', required: false },
  { key: 'remetenteBairro', label: 'Bairro Remetente', required: false },
  { key: 'remetenteCep', label: 'CEP Remetente', required: false },
  { key: 'remetenteMunicipio', label: 'Município Remetente', required: false },
  { key: 'remetenteUf', label: 'UF Remetente', required: false },
  { key: 'cliente', label: 'Cliente (apelido)', required: true },
  { key: 'nomeRazaoSocial', label: 'Destinatário', required: true },
  { key: 'cnpjCpf', label: 'CNPJ / CPF', required: true },
  { key: 'dataPedido', label: 'Data do Pedido', required: true },
  { key: 'dataExpedicao', label: 'Data de Expedição', required: false },
  { key: 'previsao', label: 'Previsão', required: false },
  { key: 'dataEntrega', label: 'Data de Entrega', required: false },
  { key: 'enderecoCompleto', label: 'Endereço', required: true },
  { key: 'numero', label: 'Nº', required: false },
  { key: 'complemento', label: 'Complemento', required: false },
  { key: 'bairroDistrito', label: 'Bairro / Distrito', required: false },
  { key: 'cep', label: 'CEP', required: false },
  { key: 'municipio', label: 'Município', required: false },
  { key: 'uf', label: 'UF', required: true },
  { key: 'foneFax', label: 'Fone / Fax', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'ocorrencia', label: 'Ocorrência', required: false },
  { key: 'valorCobranca', label: 'Valor Cobrança', required: false },
  { key: 'valorPagamento', label: 'Valor Pagamento', required: false },
  { key: 'codigoRastreio', label: 'Código de Rastreio', required: false },
  { key: 'melhorEnvioId', label: 'ID Melhor Envio', required: false },
];

// Normaliza um cabeçalho para comparação: sem acento, minúsculo, só letras/números.
// Assim "CNPJ / CPF", "cnpj/cpf" e "Cnpj Cpf" batem todos no mesmo campo.
export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}
