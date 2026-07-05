import { supabase } from './supabaseClient';

// Documentos de Agregados/Parceiros ficam num bucket privado do Supabase
// Storage — mesmo padrão de src/lib/comprovantes.ts, mas 1 registro pode ter
// vários documentos (cada um com rótulo próprio), por isso vira tabela filha
// (partner_documents) em vez de um campo único na tabela principal.
const BUCKET = 'documentos-parceiros';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];

export interface PartnerDocument {
  id: string;
  partnerId: string;
  rotulo: string;
  arquivoPath: string;
  arquivoNome: string;
  createdAt: string;
}

interface PartnerDocumentRow {
  id: string;
  partner_id: string;
  rotulo: string;
  arquivo_path: string;
  arquivo_nome: string;
  created_at: string;
}

function fromRow(row: PartnerDocumentRow): PartnerDocument {
  return {
    id: row.id,
    partnerId: row.partner_id,
    rotulo: row.rotulo,
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

function validateDocumentFile(file: File): string | null {
  const ext = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`;
  const typeOk = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
  if (!typeOk) return 'Formato inválido. Envie um arquivo PNG, JPEG ou PDF.';
  if (file.size > MAX_SIZE_BYTES) return 'Arquivo maior que 10MB.';
  return null;
}

export async function fetchDocumentsForPartner(partnerId: string): Promise<PartnerDocument[]> {
  const { data, error } = await supabase
    .from('partner_documents')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as PartnerDocumentRow[]).map(fromRow);
}

export async function uploadPartnerDocument(partnerId: string, rotulo: string, file: File): Promise<PartnerDocument> {
  const validationError = validateDocumentFile(file);
  if (validationError) throw new Error(validationError);

  const path = `${partnerId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('partner_documents')
    .insert({ partner_id: partnerId, rotulo, arquivo_path: path, arquivo_nome: file.name })
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as PartnerDocumentRow);
}

export async function getPartnerDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function removePartnerDocument(id: string, path: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
  if (storageError) throw storageError;

  const { error } = await supabase.from('partner_documents').delete().eq('id', id);
  if (error) throw error;
}
