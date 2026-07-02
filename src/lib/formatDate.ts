// Converte "YYYY-MM-DD..." para "DD/MM/AAAA". Valores que não começam com
// uma data ISO (ex: "Reagendado", "Hoje, 18:00") voltam inalterados, pois
// campos como `previsao` aceitam texto livre além de datas.
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
