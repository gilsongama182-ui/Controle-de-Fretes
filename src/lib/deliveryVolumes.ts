import { supabase } from './supabaseClient';

export interface Volume {
  id: string;
  deliveryId: string;
  ordem: number;
  peso: number;       // kg
  altura: number;     // cm
  largura: number;    // cm
  comprimento: number; // cm
}

export interface VolumeInput {
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
}

interface VolumeRow {
  id: string;
  delivery_id: string;
  ordem: number;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
}

function fromRow(row: VolumeRow): Volume {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    ordem: row.ordem,
    peso: row.peso,
    altura: row.altura,
    largura: row.largura,
    comprimento: row.comprimento,
  };
}

export async function fetchAllVolumes(): Promise<Volume[]> {
  const { data, error } = await supabase
    .from('delivery_volumes')
    .select('*')
    .order('ordem', { ascending: true });

  if (error) throw error;
  return (data as VolumeRow[]).map(fromRow);
}

// Estratégia "substitui tudo": remove os volumes atuais da entrega e insere
// o novo conjunto — mais simples que tentar diferenciar volumes alterados/
// removidos/adicionados, e o único padrão de escrita multi-linha já usado
// no projeto (sem RPC/transação em nenhum outro lugar do código).
export async function saveVolumesForDelivery(deliveryId: string, volumes: VolumeInput[]): Promise<Volume[]> {
  const { error: delError } = await supabase.from('delivery_volumes').delete().eq('delivery_id', deliveryId);
  if (delError) throw delError;

  if (volumes.length === 0) return [];

  const rows = volumes.map((v, i) => ({
    delivery_id: deliveryId,
    ordem: i + 1,
    peso: v.peso,
    altura: v.altura,
    largura: v.largura,
    comprimento: v.comprimento,
  }));

  const { data, error } = await supabase.from('delivery_volumes').insert(rows).select('*');
  if (error) throw error;
  return (data as VolumeRow[]).map(fromRow);
}
