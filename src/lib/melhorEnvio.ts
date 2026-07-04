import { supabase } from './supabaseClient';
import { fetchDeliveriesByIds } from './deliveries';
import { Delivery } from '../types';

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  return token;
}

// Navega o navegador pro fluxo de autorização da Melhor Envio (o usuário
// aprova lá, e é redirecionado de volta pro app já conectado).
export function connectMelhorEnvio(): void {
  window.location.href = '/api/melhor-envio/authorize';
}

export interface MelhorEnvioStatus {
  connected: boolean;
  connectedAt: string | null;
  updatedAt: string | null;
  scope: string | null;
}

export async function getMelhorEnvioStatus(): Promise<MelhorEnvioStatus> {
  const token = await getAccessToken();
  const resp = await fetch('/api/melhor-envio/status', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Não foi possível checar o status (HTTP ${resp.status}).`);
  }
  return resp.json();
}

export interface SyncItemResult {
  deliveryId: string;
  ok: boolean;
  rawStatus?: string;
  mappedStatus?: string | null;
  previsao?: string | null;
  valorPagamento?: number | null;
  error?: string;
}

export interface SyncTrackingResult {
  results: SyncItemResult[];
  deliveries: Delivery[];
}

export async function syncTracking(deliveryIds: string[]): Promise<SyncTrackingResult> {
  const token = await getAccessToken();
  const resp = await fetch('/api/melhor-envio/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deliveryIds }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Não foi possível sincronizar o rastreio (HTTP ${resp.status}).`);
  }

  const body = (await resp.json()) as { results: SyncItemResult[] };
  const updatedIds = body.results.filter((r) => r.ok).map((r) => r.deliveryId);
  const deliveries = await fetchDeliveriesByIds(updatedIds);

  return { results: body.results, deliveries };
}
