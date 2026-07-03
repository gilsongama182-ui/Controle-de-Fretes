export type DeliveryStatus = 'ENTREGUE' | 'EM ROTA' | 'EM ATRASO' | 'FALHA';

export interface Delivery {
  id: string; // uuid (chave real no banco)
  codigo: string; // e.g., "#HM-9241" (código de exibição)
  nfe: string; // e.g., "112.983-01"
  remetente: string; // quem contrata o frete (vincula a conta cliente)
  remetenteCnpj: string;
  cliente: string; // destinatário: short name de quem recebe a carga
  nomeRazaoSocial: string; // full company name (destinatário)
  cnpjCpf: string; // CNPJ/CPF do destinatário
  dataPedido: string; // YYYY-MM-DD
  dataExpedicao: string; // YYYY-MM-DD
  previsao: string; // YYYY-MM-DD or readable string
  dataEntrega: string; // YYYY-MM-DD, data real de entrega (vazio se ainda não entregue)
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

export type ProfileType = 'cliente' | 'operador' | 'master';
export type Genero = 'masculino' | 'feminino' | 'nao_informado';

export interface User {
  id: string; // uuid do auth.users / profiles
  name: string;
  email: string;
  profileType: ProfileType;
  document: string;
  genero: Genero;
}

export type ActivePage =
  | 'login'
  | 'cadastro'
  | 'dashboard-operador'
  | 'dashboard-cliente'
  | 'gestao-entregas'
  | 'edicao-entrega'
  | 'usuarios';
