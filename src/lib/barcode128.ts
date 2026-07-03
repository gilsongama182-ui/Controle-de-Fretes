// Gerador de código de barras Code 128 (subset C, para strings só de dígitos
// com quantidade par de caracteres — é o caso da chave de acesso da NF-e,
// sempre 44 dígitos). Implementado do zero (sem dependência externa) pelo
// mesmo motivo que evitamos o pacote xlsx: menos superfície de risco.
//
// Referência: tabela padrão de larguras de módulo do Code 128 (ISO/IEC 15417).
// Cada símbolo (valores 0–102, mais START A/B/C e STOP) tem um padrão de
// larguras de barra/espaço que soma 11 módulos (13 no STOP).
const PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', // 0-102
  '211412', // 103 START A
  '211214', // 104 START B
  '211232', // 105 START C
];
const STOP_PATTERN = '2331112'; // 106 STOP (13 módulos)
const START_C = 105;

export interface BarcodeBar {
  x: number; // posição inicial em módulos
  width: number; // largura em módulos
}

// Retorna as barras escuras (em unidades de "módulo") de um Code 128 Set C.
// Só aceita strings com dígitos em quantidade par; outros formatos retornam null.
export function encodeCode128C(digits: string): { bars: BarcodeBar[]; totalModules: number } | null {
  if (!/^\d+$/.test(digits) || digits.length % 2 !== 0) return null;

  const values: number[] = [START_C];
  for (let i = 0; i < digits.length; i += 2) {
    values.push(Number(digits.slice(i, i + 2)));
  }

  let checksum = values[0];
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  values.push(checksum % 103);

  const patterns = values.map((v) => PATTERNS[v]);
  patterns.push(STOP_PATTERN);

  const bars: BarcodeBar[] = [];
  let cursor = 0;
  patterns.forEach((pattern) => {
    for (let i = 0; i < pattern.length; i++) {
      const width = Number(pattern[i]);
      const isBar = i % 2 === 0; // primeiro elemento de cada símbolo é sempre barra escura
      if (isBar) bars.push({ x: cursor, width });
      cursor += width;
    }
  });

  return { bars, totalModules: cursor };
}
