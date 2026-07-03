// Formata telefone BR: 11 dígitos (celular, com 9) -> "(XX) XXXXX-XXXX";
// 10 dígitos (fixo) -> "(XX) XXXX-XXXX". Outros tamanhos (ramal, número
// estrangeiro etc.) voltam como vieram, sem forçar um formato errado.
export function formatPhoneBR(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return value;
}
