import { Delivery } from '../types';

// previsao/dataEntrega às vezes vêm em formato BR (DD/MM/AAAA) de importações
// antigas, além do ISO (AAAA-MM-DD) usado pelos campos de data atuais —
// normaliza pra ISO antes de comparar. Retorna null quando não é uma data
// reconhecível (previsao aceita texto livre, ex: "Reagendado").
function toIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

// Data de hoje no fuso local (não UTC) — evita virar o dia errado perto da
// meia-noite quando comparado com toISOString(), que é sempre UTC.
export function hojeIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

// Ainda não entregue e com a previsão já vencida. Cálculo só para os cards de
// performance — não altera o status gravado no banco nem o badge das listas.
// Quando o atraso é de responsabilidade do cliente (destinatário indisponível,
// recusou recebimento etc.), não conta contra a nossa performance. Carga que
// ainda nem foi expedida também não conta — o prazo só começa a valer depois
// que ela sai.
export function isAtrasadoEfetivo(d: Delivery): boolean {
  if (d.status === 'ENTREGUE' || d.status === 'FALHA' || d.status === 'DEVOLVIDO' || d.status === 'AGUARDANDO EXPEDIÇÃO') return false;
  if (d.atrasoResponsabilidade === 'cliente') return false;
  const previsaoIso = toIsoDate(d.previsao);
  if (!previsaoIso) return false;
  return previsaoIso < hojeIso();
}

// Entregue, porém depois da previsão — ainda conta como sucesso na Taxa de
// Entrega, só não foi dentro do prazo. Quando a previsão não é uma data (texto
// livre) ou falta a data de entrega, assume dentro do prazo. Mesma exceção de
// responsabilidade do cliente do isAtrasadoEfetivo.
export function isEntregueForaDoPrazo(d: Delivery): boolean {
  if (d.status !== 'ENTREGUE' || !d.dataEntrega) return false;
  if (d.atrasoResponsabilidade === 'cliente') return false;
  const previsaoIso = toIsoDate(d.previsao);
  const entregaIso = toIsoDate(d.dataEntrega);
  if (!previsaoIso || !entregaIso) return false;
  return entregaIso > previsaoIso;
}

export function isEntregueNoPrazo(d: Delivery): boolean {
  return d.status === 'ENTREGUE' && !isEntregueForaDoPrazo(d);
}

// Data de Entrega depois da Previsão, sem considerar quem é o responsável —
// usado só para decidir se faz sentido exibir a coluna "Responsável pelo
// Atraso" (no relatório e na tela de edição): ela só existe quando a entrega
// realmente saiu do prazo.
export function isForaDoPrazoBruto(d: Delivery): boolean {
  if (!d.dataEntrega) return false;
  const previsaoIso = toIsoDate(d.previsao);
  const entregaIso = toIsoDate(d.dataEntrega);
  if (!previsaoIso || !entregaIso) return false;
  return entregaIso > previsaoIso;
}

// FALHA ainda não lida pelo cliente — dispara o alerta no sino da área do
// cliente. Fica não lida até falhaLidaEm ser preenchido (marcar como lida)
// ou até o status sair e voltar a ser FALHA (o trigger reset_falha_lida_em
// reabre o alerta nesse caso).
export function isFalhaNaoLida(d: Delivery): boolean {
  return d.status === 'FALHA' && !d.falhaLidaEm;
}

// Últimas 20 ocorrências de FALHA (lidas ou não) — histórico do sino de
// notificações do cliente. `deliveries` já chega ordenado por created_at
// desc (fetchDeliveries), então basta filtrar e cortar as 20 primeiras.
export function ultimasFalhas(deliveries: Delivery[]): Delivery[] {
  return deliveries.filter((d) => d.status === 'FALHA').slice(0, 20);
}
