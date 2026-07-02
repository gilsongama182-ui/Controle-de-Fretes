// Remove pontos do número da NF-e para exibição (ex: "112.973-14" -> "112973-14").
export function formatNfe(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\./g, '');
}
