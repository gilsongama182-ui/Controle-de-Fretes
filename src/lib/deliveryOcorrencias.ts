import { supabase } from './supabaseClient';

// Ocorrências tipificadas registradas numa entrega (destinatário ausente,
// endereço incorreto, recusado pelo destinatário), cada uma com sua data.
// Tabela filha (mesmo padrão de delivery_comprovantes, ver lib/comprovantes.ts)
// porque uma entrega pode acumular várias ocorrências ao longo do tempo — uma
// nova não substitui as anteriores.
export type TipoOcorrencia = 'DESTINATÁRIO AUSENTE' | 'ENDEREÇO INCORRETO' | 'RECUSADO PELO DESTINATÁRIO';

export interface DeliveryOcorrencia {
  id: string;
  deliveryId: string;
  tipo: TipoOcorrencia;
  dataOcorrencia: string;
  createdAt: string;
}

interface DeliveryOcorrenciaRow {
  id: string;
  delivery_id: string;
  tipo: TipoOcorrencia;
  data_ocorrencia: string;
  created_at: string;
}

function fromRow(row: DeliveryOcorrenciaRow): DeliveryOcorrencia {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    tipo: row.tipo,
    dataOcorrencia: row.data_ocorrencia,
    createdAt: row.created_at,
  };
}

// Busca as ocorrências de todas as entregas de uma vez (usado no App.tsx pra
// montar um Map por delivery, mesmo padrão de fetchAllComprovantes).
export async function fetchAllOcorrencias(): Promise<DeliveryOcorrencia[]> {
  const { data, error } = await supabase
    .from('delivery_ocorrencias')
    .select('*')
    .order('data_ocorrencia', { ascending: false });

  if (error) throw error;
  return (data as DeliveryOcorrenciaRow[]).map(fromRow);
}

export async function addOcorrencia(deliveryId: string, tipo: TipoOcorrencia, dataOcorrencia: string): Promise<DeliveryOcorrencia> {
  const { data, error } = await supabase
    .from('delivery_ocorrencias')
    .insert({ delivery_id: deliveryId, tipo, data_ocorrencia: dataOcorrencia })
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as DeliveryOcorrenciaRow);
}

export async function removeOcorrencia(id: string): Promise<void> {
  const { error } = await supabase.from('delivery_ocorrencias').delete().eq('id', id);
  if (error) throw error;
}
