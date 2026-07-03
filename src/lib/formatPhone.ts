// Formata telefone BR: 11 dígitos (celular, com 9) -> "(XX) XXXXX-XXXX";
// 10 dígitos (fixo) -> "(XX) XXXX-XXXX". Outros tamanhos (ramal, número
// estrangeiro etc.) voltam como vieram, sem forçar um formato errado.
export function formatPhoneBR(value: string | null | undefined): string {
  if (!value) return '';
  let digits = value.replace(/\D/g, '');
  // Com DDD + código do Brasil (55) o número tem 12 ou 13 dígitos — nesse
  // tamanho o "55" só pode ser o código do país (um DDD sozinho já dá 10/11
  // dígitos), então é seguro remover antes de formatar.
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return value;
}
