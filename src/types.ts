export type DeliveryStatus = 'ENTREGUE' | 'EM ROTA' | 'EM ATRASO' | 'FALHA';

export interface Delivery {
  id: string; // uuid (chave real no banco)
  codigo: string; // e.g., "#HM-9241" (código de exibição)
  nfe: string; // e.g., "112.983-01"
  pedido: string; // referência do pedido do cliente (vinda do <infCpl> no XML de NF-e)
  remetente: string; // quem contrata o frete (vincula a conta cliente)
  remetenteCnpj: string;
  cliente: string; // destinatário: short name de quem recebe a carga
  nomeRazaoSocial: string; // full company name (destinatário)
  cnpjCpf: string; // CNPJ/CPF do destinatário
  dataPedido: string; // YYYY-MM-DD
  dataExpedicao: string; // YYYY-MM-DD
  previsao: string; // YYYY-MM-DD
  dataEntrega: string; // YYYY-MM-DD, data real de entrega (vazio se ainda não entregue)
  enderecoCompleto: string;
  numero: string; // número do endereço
  complemento: string; // complemento do endereço
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
  chaveAcessoNfe: string; // uso interno (não aparece em tela)
  valorTotalNota: number; // uso interno (não aparece em tela)
  comprovantePath: string; // caminho do arquivo no Storage (privado)
  comprovanteNome: string; // nome original do arquivo enviado
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
