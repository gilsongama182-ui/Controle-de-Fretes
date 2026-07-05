import { Delivery } from '../types';

// Mesma checagem de "é uma data de verdade" usada no preenchimento automático
// de status em EdicaoEntregaScreen.tsx — previsao aceita texto livre além de
// datas (ex: "Reagendado"), então nem sempre dá pra comparar.
const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

// Ainda não entregue e com a previsão já vencida. Cálculo só para os cards de
// performance — não altera o status gravado no banco nem o badge das listas.
export function isAtrasadoEfetivo(d: Delivery): boolean {
  if (d.status === 'ENTREGUE' || d.status === 'FALHA') return false;
  if (!isValidDate(d.previsao)) return false;
  const hojeStr = new Date().toISOString().split('T')[0];
  return d.previsao < hojeStr;
}

// Entregue, porém depois da previsão — ainda conta como sucesso na Taxa de
// Entrega, só não foi dentro do prazo. Quando a previsão não é uma data (texto
// livre) ou falta a data de entrega, assume dentro do prazo.
export function isEntregueForaDoPrazo(d: Delivery): boolean {
  if (d.status !== 'ENTREGUE') return false;
  if (!d.dataEntrega || !isValidDate(d.previsao) || !isValidDate(d.dataEntrega)) return false;
  return d.dataEntrega > d.previsao;
}

export function isEntregueNoPrazo(d: Delivery): boolean {
  return d.status === 'ENTREGUE' && !isEntregueForaDoPrazo(d);
}
