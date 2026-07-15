import { supabase } from './supabaseClient';
import { fetchDeliveriesByIds } from './deliveries';
import { Delivery } from '../types';

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  return token;
}

export interface LoggiSyncItemResult {
  deliveryId: string;
  ok: boolean;
  rawStatus?: string;
  mappedStatus?: string | null;
  error?: string;
}

export interface LoggiSyncTrackingResult {
  results: LoggiSyncItemResult[];
  deliveries: Delivery[];
}

// Sync manual disparado pelo botão "Sincronizar Loggi" — loga na Loggi e lê
// o painel de envios na hora (pode demorar mais que o da Melhor Envio, é
// login real via navegador headless, não uma chamada REST).
export async function syncLoggiTracking(deliveryIds: string[]): Promise<LoggiSyncTrackingResult> {
  const token = await getAccessToken();
  const resp = await fetch('/api/loggi/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deliveryIds }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Não foi possível sincronizar com a Loggi (HTTP ${resp.status}).`);
  }

  const body = (await resp.json()) as { results: LoggiSyncItemResult[] };
  const updatedIds = body.results.filter((r) => r.ok).map((r) => r.deliveryId);
  const deliveries = await fetchDeliveriesByIds(updatedIds);

  return { results: body.results, deliveries };
}
