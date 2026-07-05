export type DeliveryStatus = 'ENTREGUE' | 'EM ROTA' | 'EM ATRASO' | 'FALHA';
export type AtrasoResponsabilidade = 'proprio' | 'cliente';

export interface Delivery {
  id: string; // uuid (chave real no banco)
  codigo: string; // e.g., "#HM-9241" (código de exibição)
  nfe: string; // e.g., "112.983-01"
  pedido: string; // referência do pedido do cliente (vinda do <infCpl> no XML de NF-e)
  remetente: string; // quem contrata o frete (vincula a conta cliente)
  remetenteCnpj: string;
  remetenteEndereco: string; // logradouro do remetente (<emit><enderEmit><xLgr> no XML)
  remetenteNumero: string;
  remetenteComplemento: string;
  remetenteBairro: string;
  remetenteCep: string;
  remetenteMunicipio: string;
  remetenteUf: string;
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
  // Quem causou um eventual atraso: "proprio" (nossa responsabilidade, conta
  // nos indicadores de performance) ou "cliente" (destinatário indisponível,
  // recusou recebimento etc. — não conta contra a nossa performance).
  atrasoResponsabilidade: AtrasoResponsabilidade;
  // ISO datetime de quando o cliente marcou a FALHA como lida no sino de
  // notificações; vazio enquanto não lida (reaberto automaticamente se a
  // entrega voltar a ficar em FALHA).
  falhaLidaEm: string;
  valorCobranca: number; // receita
  valorPagamento: number; // custo
  codigoRastreio: string;
  chaveAcessoNfe: string; // uso interno (não aparece em tela)
  valorTotalNota: number; // uso interno (não aparece em tela)
  comprovantePath: string; // caminho do arquivo no Storage (privado)
  comprovanteNome: string; // nome original do arquivo enviado
  melhorEnvioId: string; // ID da etiqueta na Melhor Envio (diferente do codigoRastreio, que é o código público)
  melhorEnvioLastSyncAt: string; // ISO datetime da última sincronização de rastreio, vazio se nunca sincronizado
}

export type ProfileType = 'cliente' | 'operador' | 'master' | 'operador_log';
export type Genero = 'masculino' | 'feminino' | 'nao_informado';
export type AccountStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface User {
  id: string; // uuid do auth.users / profiles
  name: string;
  email: string;
  profileType: ProfileType;
  document: string;
  genero: Genero;
  status: AccountStatus;
}

export type ActivePage =
  | 'login'
  | 'cadastro'
  | 'dashboard-operador'
  | 'dashboard-cliente'
  | 'gestao-entregas'
  | 'edicao-entrega'
  | 'usuarios'
  | 'integracoes'
  | 'cubagem'
  | 'parceiros'
  | 'cadastro-parceiro';
