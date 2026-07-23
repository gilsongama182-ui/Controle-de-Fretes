import { Delivery } from '../types';
import { Volume } from './deliveryVolumes';
import { FreightRate } from './freightRates';

// Fórmula padrão do mercado: peso cubado (kg) = comprimento(m) x largura(m)
// x altura(m) x fator de conversão. Fator 300 é o combinado pra essa tabela
// (dimensões dos volumes são gravadas em cm — daí a divisão por 100 cada).
const FATOR_CUBAGEM = 300;

// "Generalidades" da tabela de frete que têm fórmula fixa (sem decisão
// humana) — as demais (Ajudante, Reentrega, Devolução, Hora Parada,
// Agendamento, Escolta, Tx Fluvial — essa removida do cálculo automático a
// pedido do usuário) ficam de fora, e entram como "Valor Acordado" manual
// na tela de Faturamento quando fizer sentido pra aquela entrega.
const GRIS_PCT = 0.0008; // 0,08% sobre o valor total da Nota Fiscal
const AD_VALOREM_PCT = 0.003; // 0,30% sobre o valor total da Nota Fiscal

// Acréscimos sobre o frete base (valorBase) em situações operacionais:
// reentrega é um flag manual (a entrega pode ter tido reentrega e mesmo assim
// terminar ENTREGUE); devolução já usa o status existente (EM DEVOLUÇÃO/
// DEVOLVIDO), sem precisar de flag novo.
const REENTREGA_PCT = 0.5; // 50% do frete base
const DEVOLUCAO_PCT = 1; // 100% do frete base
export const STATUS_DEVOLUCAO: Delivery['status'][] = ['EM DEVOLUÇÃO', 'DEVOLVIDO'];

// ICMS sobre a prestação de serviço de transporte — origem é sempre SP (único
// CD da operação), então a alíquota interestadual já é fixa por Resolução do
// Senado 22/89 (não varia por legislação estadual, ao contrário da alíquota
// interna de mercadoria): 18% dentro de SP, 12% pra outros estados do
// Sul/Sudeste, 7% pro restante (Norte/Nordeste/Centro-Oeste e ES). Base de
// cálculo inclui os acessórios da prestação (GRIS, Ad Valorem, reentrega,
// devolução), conforme art. 13 §1º da LC 87/96.
const ALIQUOTA_ICMS_SP = 0.18;
const ALIQUOTA_ICMS_SUL_SUDESTE = 0.12;
const ALIQUOTA_ICMS_DEMAIS = 0.07;
const UFS_SUL_SUDESTE_EXCETO_SP: string[] = ['MG', 'RJ', 'PR', 'RS', 'SC'];

export function aliquotaIcms(destinoUf: string): number {
  const uf = destinoUf.trim().toUpperCase();
  if (uf === 'SP') return ALIQUOTA_ICMS_SP;
  if (UFS_SUL_SUDESTE_EXCETO_SP.includes(uf)) return ALIQUOTA_ICMS_SUL_SUDESTE;
  return ALIQUOTA_ICMS_DEMAIS;
}

function cepParaNumero(cep: string): number {
  return Number(cep.replace(/\D/g, '')) || 0;
}

// Arredonda pra centavos ANTES de somar/exibir — sem isso, cada valor na
// tela já vem arredondado pro usuário (via formatMoeda), mas o número por
// trás guarda casas decimais a mais (ex: GRIS/Ad Valorem sobre um valor de
// nota com centavos quebrados). Somar os valores "crus" e só arredondar o
// total no final faz o total bater diferente da soma manual dos valores já
// arredondados mostrados linha a linha — daí arredondar aqui, na origem.
// Exportada porque o "Valor Acordado" (digitado à mão) usa a mesma regra.
export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function pesoCubadoVolume(v: Pick<Volume, 'altura' | 'largura' | 'comprimento'>): number {
  return (v.altura / 100) * (v.largura / 100) * (v.comprimento / 100) * FATOR_CUBAGEM;
}

export function pesoRealTotal(volumes: Volume[]): number {
  return volumes.reduce((soma, v) => soma + v.peso, 0);
}

export function pesoCubadoTotal(volumes: Volume[]): number {
  return volumes.reduce((soma, v) => soma + pesoCubadoVolume(v), 0);
}

// O que realmente é cobrado: o maior entre o peso real somado e o peso
// cubado somado (regra padrão do setor — "o que for maior prevalece").
export function pesoConsiderado(volumes: Volume[]): number {
  return Math.max(pesoRealTotal(volumes), pesoCubadoTotal(volumes));
}

// Acha a faixa de CEP certa pra essa UF entre as tarifas cadastradas —
// algumas UFs têm mais de uma faixa "Interior" com preços iguais ou
// diferentes (ex: GO tem 3 faixas), por isso sempre filtra por CEP, nunca
// só por tipo_tarifa.
export function buscarTarifa(uf: string, cep: string, tarifas: FreightRate[]): FreightRate | null {
  const ufAlvo = uf.trim().toUpperCase();
  const cepNum = cepParaNumero(cep);
  return (
    tarifas.find(
      (t) => t.uf.toUpperCase() === ufAlvo && cepNum >= cepParaNumero(t.cepInicial) && cepNum <= cepParaNumero(t.cepFinal),
    ) ?? null
  );
}

function valorBasePorPeso(tarifa: FreightRate, peso: number): number {
  if (peso <= 5) return tarifa.valor5kg;
  if (peso <= 10) return tarifa.valor10kg;
  if (peso <= 15) return tarifa.valor15kg;
  if (peso <= 20) return tarifa.valor20kg;
  if (peso <= 30) return tarifa.valor30kg;
  return tarifa.valor30kg + (peso - 30) * tarifa.kgAdicional;
}

export interface ResultadoFrete {
  tarifaEncontrada: boolean;
  pesoReal: number;
  pesoCubado: number;
  pesoConsiderado: number;
  valorBase: number;
  gris: number;
  adValorem: number;
  acrescimoReentrega: number;
  acrescimoDevolucao: number;
  aliquotaIcms: number;
  icms: number;
  valorTotal: number;
}

export function calcularFrete(delivery: Delivery, volumes: Volume[], tarifas: FreightRate[]): ResultadoFrete {
  const pesoReal = pesoRealTotal(volumes);
  const pesoCubado = pesoCubadoTotal(volumes);
  const peso = Math.max(pesoReal, pesoCubado);

  const tarifa = buscarTarifa(delivery.uf, delivery.cep, tarifas);
  const valorBase = arredondar(tarifa ? valorBasePorPeso(tarifa, peso) : 0);

  const valorNota = delivery.valorTotalNota || 0;
  const gris = arredondar(valorNota * GRIS_PCT);
  const adValorem = arredondar(valorNota * AD_VALOREM_PCT);

  const acrescimoReentrega = delivery.reentrega ? arredondar(valorBase * REENTREGA_PCT) : 0;
  const acrescimoDevolucao = STATUS_DEVOLUCAO.includes(delivery.status) ? arredondar(valorBase * DEVOLUCAO_PCT) : 0;

  const aliq = aliquotaIcms(delivery.uf);
  const baseIcms = valorBase + gris + adValorem + acrescimoReentrega + acrescimoDevolucao;
  const icms = arredondar(baseIcms * aliq);

  return {
    tarifaEncontrada: tarifa !== null,
    pesoReal,
    pesoCubado,
    pesoConsiderado: peso,
    valorBase,
    gris,
    adValorem,
    acrescimoReentrega,
    acrescimoDevolucao,
    aliquotaIcms: aliq,
    icms,
    valorTotal: arredondar(baseIcms + icms),
  };
}
