export type DeliveryStatus = 'ENTREGUE' | 'EM ROTA' | 'EM ATRASO' | 'FALHA';

export interface Delivery {
  id: string; // uuid (chave real no banco)
  codigo: string; // e.g., "#HM-9241" (código de exibição)
  nfe: string; // e.g., "112.983-01"
  cliente: string; // short client name
  nomeRazaoSocial: string; // full company name
  cnpjCpf: string;
  dataPedido: string; // YYYY-MM-DD
  dataExpedicao: string; // YYYY-MM-DD
  previsao: string; // YYYY-MM-DD or readable string
  enderecoCompleto: string;
  bairroDistrito: string;
  cep: string;
  municipio: string;
  uf: string;
  foneFax: string;
  status: DeliveryStatus;
  ocorrencia: string;
  valorCobranca: number; // receita
  valorPagamento: number; // custo
  codigoRastreio: string;
}

export interface User {
  id: string; // uuid do auth.users / profiles
  name: string;
  email: string;
  profileType: 'cliente' | 'operador';
  document: string;
}

export type ActivePage = 
  | 'login'
  | 'cadastro'
  | 'dashboard-operador'
  | 'dashboard-cliente'
  | 'gestao-entregas'
  | 'edicao-entrega';
