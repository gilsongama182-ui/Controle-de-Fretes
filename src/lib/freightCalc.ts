import { Delivery } from '../types';
import { Volume } from './deliveryVolumes';
import { FreightRate } from './freightRates';

// Fórmula padrão do mercado: peso cubado (kg) = comprimento(m) x largura(m)
// x altura(m) x fator de conversão. Fator 300 é o combinado pra essa tabela
// (dimensões dos volumes são gravadas em cm — daí a divisão por 100 cada).
const FATOR_CUBAGEM = 300;

// "Generalidades" da tabela de frete que têm fórmula fixa (sem decisão
// humana) — as demais (Ajudante, Reentrega, Devolução, Hora Parada,
// Agendamento, Escolta) ficam de fora do cálculo automático de propósito.
const GRIS_PCT = 0.0008; // 0,08% sobre o valor total da Nota Fiscal
const AD_VALOREM_PCT = 0.003; // 0,30% sobre o valor total da Nota Fiscal
const TX_FLUVIAL_PCT = 0.08; // 8% sobre o valor total da NF, só nos estados abaixo
const UFS_TX_FLUVIAL = ['AM', 'AP', 'TO'];

function cepParaNumero(cep: string): number {
  return Number(cep.replace(/\D/g, '')) || 0;
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
  txFluvial: number;
  valorTotal: number;
}

export function calcularFrete(delivery: Delivery, volumes: Volume[], tarifas: FreightRate[]): ResultadoFrete {
  const pesoReal = pesoRealTotal(volumes);
  const pesoCubado = pesoCubadoTotal(volumes);
  const peso = Math.max(pesoReal, pesoCubado);

  const tarifa = buscarTarifa(delivery.uf, delivery.cep, tarifas);
  const valorBase = tarifa ? valorBasePorPeso(tarifa, peso) : 0;

  const valorNota = delivery.valorTotalNota || 0;
  const gris = valorNota * GRIS_PCT;
  const adValorem = valorNota * AD_VALOREM_PCT;
  const txFluvial = UFS_TX_FLUVIAL.includes(delivery.uf.trim().toUpperCase()) ? valorNota * TX_FLUVIAL_PCT : 0;

  return {
    tarifaEncontrada: tarifa !== null,
    pesoReal,
    pesoCubado,
    pesoConsiderado: peso,
    valorBase,
    gris,
    adValorem,
    txFluvial,
    valorTotal: valorBase + gris + adValorem + txFluvial,
  };
}
