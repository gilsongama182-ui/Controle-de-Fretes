import { supabase } from './supabaseClient';

export interface Invoice {
  id: string;
  numero: string;
  criadoEm: string;
  criadoPor: string | null;
}

interface InvoiceRow {
  id: string;
  numero: string;
  criado_em: string;
  criado_por: string | null;
}

function fromRow(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    numero: row.numero,
    criadoEm: row.criado_em,
    criadoPor: row.criado_por,
  };
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase.from('invoices').select('*').order('criado_em', { ascending: false });
  if (error) throw error;
  return (data as InvoiceRow[]).map(fromRow);
}

// Cria o cabeçalho da fatura (número sequencial gerado automaticamente no
// banco, começando em 0200) e vincula as entregas selecionadas numa
// transação só (RPC) — evita fatura órfã se o segundo passo falhar.
export async function createInvoice(deliveryIds: string[]): Promise<Invoice> {
  const { data, error } = await supabase.rpc('criar_fatura', { p_delivery_ids: deliveryIds });
  if (error) throw error;
  return fromRow(data as InvoiceRow);
}

// Só pra exibir em tela qual vai ser o próximo número (não consome a
// sequência — nextval() só é chamado de verdade dentro de createInvoice).
export async function fetchProximoNumeroFatura(): Promise<string> {
  const { data, error } = await supabase.rpc('proximo_numero_fatura');
  if (error) throw error;
  return data as string;
}

// Desfaz a fatura: libera as entregas vinculadas (voltam a "pendente") e
// remove o cabeçalho — também via RPC, mesma razão do createInvoice.
export async function removeInvoice(id: string): Promise<void> {
  const { error } = await supabase.rpc('remover_fatura', { p_invoice_id: id });
  if (error) throw error;
}
