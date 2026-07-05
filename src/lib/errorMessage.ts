// Erros do Supabase (PostgrestError, StorageError etc.) são objetos simples
// com uma propriedade "message", não instâncias de Error — "err instanceof
// Error" sozinho não pega a mensagem real nesses casos e cai sempre no
// fallback genérico, escondendo a causa de verdade.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}
