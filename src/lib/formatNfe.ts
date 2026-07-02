// Remove pontos e traços do número da NF-e para exibição (ex: "112.973-14" -> "11297314").
export function formatNfe(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/[.-]/g, '');
}
