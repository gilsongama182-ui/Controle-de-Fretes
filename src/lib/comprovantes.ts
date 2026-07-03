import { supabase } from './supabaseClient';

// Comprovantes de entrega ficam num bucket privado do Supabase Storage.
// Visualização usa URL assinada com expiração curta (não há link público).
const BUCKET = 'comprovantes';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function validateComprovanteFile(file: File): string | null {
  const ext = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`;
  const typeOk = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
  if (!typeOk) return 'Formato inválido. Envie um arquivo PNG, JPEG ou PDF.';
  if (file.size > MAX_SIZE_BYTES) return 'Arquivo maior que 10MB.';
  return null;
}

export async function uploadComprovante(deliveryId: string, file: File): Promise<{ path: string; nome: string }> {
  const validationError = validateComprovanteFile(file);
  if (validationError) throw new Error(validationError);

  const path = `${deliveryId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;

  return { path, nome: file.name };
}

export async function getComprovanteUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeComprovante(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
