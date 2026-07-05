// Formata CPF/CNPJ BR: 11 dígitos -> "000.000.000-00"; 14 dígitos ->
// "00.000.000/0000-00". Outros tamanhos (documento estrangeiro, incompleto
// etc.) voltam como vieram, sem forçar um formato errado.
export function formatCpfCnpj(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return value;
}
