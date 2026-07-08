import { supabase } from './supabaseClient';

// Comprovantes de entrega ficam num bucket privado do Supabase Storage —
// mesmo padrão de src/lib/partnerDocuments.ts, mas 1 entrega pode ter vários
// comprovantes, por isso é uma tabela filha (delivery_comprovantes) em vez de
// um campo único na tabela principal. Visualização usa URL assinada com
// expiração curta (não há link público).
const BUCKET = 'comprovantes';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];

export interface DeliveryComprovante {
  id: string;
  deliveryId: string;
  arquivoPath: string;
  arquivoNome: string;
  createdAt: string;
}

interface DeliveryComprovanteRow {
  id: string;
  delivery_id: string;
  arquivo_path: string;
  arquivo_nome: string;
  created_at: string;
}

function fromRow(row: DeliveryComprovanteRow): DeliveryComprovante {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    arquivoPath: row.arquivo_path,
    arquivoNome: row.arquivo_nome,
    createdAt: row.created_at,
  };
}

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

// Busca todos os comprovantes de todas as entregas de uma vez (usado no
// App.tsx pra montar um Map por delivery, mesmo padrão de fetchAllVolumes em
// src/lib/deliveryVolumes.ts — evita 1 query por entrega).
export async function fetchAllComprovantes(): Promise<DeliveryComprovante[]> {
  const { data, error } = await supabase
    .from('delivery_comprovantes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as DeliveryComprovanteRow[]).map(fromRow);
}

export async function uploadComprovante(deliveryId: string, file: File): Promise<DeliveryComprovante> {
  const validationError = validateComprovanteFile(file);
  if (validationError) throw new Error(validationError);

  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  const path = `${deliveryId}/${Date.now()}-${uniqueSuffix}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('delivery_comprovantes')
    .insert({ delivery_id: deliveryId, arquivo_path: path, arquivo_nome: file.name })
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as DeliveryComprovanteRow);
}

export async function getComprovanteUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeComprovante(id: string, path: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
  if (storageError) throw storageError;

  const { error } = await supabase.from('delivery_comprovantes').delete().eq('id', id);
  if (error) throw error;
}
