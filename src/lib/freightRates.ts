import { supabase } from './supabaseClient';

export type TipoTarifa = 'Capital' | 'Interior';

export interface FreightRate {
  id: string;
  uf: string;
  tipoTarifa: TipoTarifa;
  cepInicial: string;
  cepFinal: string;
  valor5kg: number;
  valor10kg: number;
  valor15kg: number;
  valor20kg: number;
  valor30kg: number;
  kgAdicional: number;
}

export type FreightRateInput = Omit<FreightRate, 'id'>;

interface FreightRateRow {
  id: string;
  uf: string;
  tipo_tarifa: TipoTarifa;
  cep_inicial: string;
  cep_final: string;
  valor_5kg: number;
  valor_10kg: number;
  valor_15kg: number;
  valor_20kg: number;
  valor_30kg: number;
  kg_adicional: number;
}

function fromRow(row: FreightRateRow): FreightRate {
  return {
    id: row.id,
    uf: row.uf,
    tipoTarifa: row.tipo_tarifa,
    cepInicial: row.cep_inicial,
    cepFinal: row.cep_final,
    valor5kg: row.valor_5kg,
    valor10kg: row.valor_10kg,
    valor15kg: row.valor_15kg,
    valor20kg: row.valor_20kg,
    valor30kg: row.valor_30kg,
    kgAdicional: row.kg_adicional,
  };
}

function toRow(input: FreightRateInput) {
  return {
    uf: input.uf.toUpperCase(),
    tipo_tarifa: input.tipoTarifa,
    cep_inicial: input.cepInicial,
    cep_final: input.cepFinal,
    valor_5kg: input.valor5kg,
    valor_10kg: input.valor10kg,
    valor_15kg: input.valor15kg,
    valor_20kg: input.valor20kg,
    valor_30kg: input.valor30kg,
    kg_adicional: input.kgAdicional,
  };
}

export async function fetchFreightRates(): Promise<FreightRate[]> {
  const { data, error } = await supabase
    .from('freight_rates')
    .select('*')
    .order('uf', { ascending: true })
    .order('tipo_tarifa', { ascending: true })
    .order('cep_inicial', { ascending: true });

  if (error) throw error;
  return (data as FreightRateRow[]).map(fromRow);
}

export async function createFreightRate(input: FreightRateInput): Promise<FreightRate> {
  const { data, error } = await supabase.from('freight_rates').insert(toRow(input)).select('*').single();
  if (error) throw error;
  return fromRow(data as FreightRateRow);
}

export async function updateFreightRate(id: string, input: FreightRateInput): Promise<FreightRate> {
  const { data, error } = await supabase
    .from('freight_rates')
    .update(toRow(input))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as FreightRateRow);
}

export async function deleteFreightRate(id: string): Promise<void> {
  const { error } = await supabase.from('freight_rates').delete().eq('id', id);
  if (error) throw error;
}
