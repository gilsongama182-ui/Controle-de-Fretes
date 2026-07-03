import type { IncomingMessage, ServerResponse } from 'http';
import {
  getBearerToken,
  getUserClient,
  getValidAccessToken,
  mapTrackingStatus,
  sendJson,
  readJsonBody,
  ME_BASE_URL,
} from './_shared';

interface SyncRequestBody {
  deliveryIds: string[];
}

interface SyncItemResult {
  deliveryId: string;
  ok: boolean;
  rawStatus?: string;
  mappedStatus?: string | null;
  error?: string;
}

// Formato exato da resposta do endpoint de rastreio da Melhor Envio não foi
// confirmado contra uma chamada real (ver plano da integração) — por isso
// a extração abaixo tenta alguns formatos plausíveis e sempre devolve o
// payload cru (`raw`) na resposta, pra dar pra inspecionar/ajustar rápido.
function extractStatusText(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const obj = entry as Record<string, unknown>;
  const direct = obj.status ?? obj.situacao ?? obj.tracking_status;
  if (typeof direct === 'string') return direct;
  const tracking = obj.tracking;
  if (Array.isArray(tracking) && tracking.length > 0) {
    const last = tracking[tracking.length - 1] as Record<string, unknown>;
    const status = last?.status ?? last?.description ?? last?.descricao;
    if (typeof status === 'string') return status;
  }
  return null;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    sendJson(res, 401, { error: 'Sessão ausente.' });
    return;
  }

  let body: SyncRequestBody;
  try {
    body = await readJsonBody<SyncRequestBody>(req);
  } catch {
    sendJson(res, 400, { error: 'Corpo da requisição inválido.' });
    return;
  }

  const deliveryIds = Array.isArray(body.deliveryIds) ? body.deliveryIds : [];
  if (deliveryIds.length === 0) {
    sendJson(res, 400, { error: 'Nenhuma entrega selecionada.' });
    return;
  }

  const userClient = getUserClient(token);

  // Só traz as entregas que a RLS realmente deixa esse usuário ver/editar —
  // mesma trava que já protege a tela de Gestão de Entregas hoje.
  const { data: deliveries, error: fetchError } = await userClient
    .from('deliveries')
    .select('id, melhor_envio_id, nfe')
    .in('id', deliveryIds);

  if (fetchError) {
    sendJson(res, 500, { error: `Não foi possível buscar as entregas: ${fetchError.message}` });
    return;
  }

  const results: SyncItemResult[] = [];
  const withMelhorEnvioId = (deliveries ?? []).filter((d) => d.melhor_envio_id);

  for (const id of deliveryIds) {
    if (!withMelhorEnvioId.some((d) => d.id === id)) {
      results.push({ deliveryId: id, ok: false, error: 'Entrega sem "ID Melhor Envio" preenchido.' });
    }
  }

  if (withMelhorEnvioId.length === 0) {
    sendJson(res, 200, { results });
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao obter token da Melhor Envio.';
    for (const d of withMelhorEnvioId) results.push({ deliveryId: d.id, ok: false, error: message });
    sendJson(res, 200, { results });
    return;
  }

  let trackingResponse: unknown;
  try {
    const resp = await fetch(`${ME_BASE_URL}/api/v2/me/shipment/tracking`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'WLOGIS (suporte@wlogis.com.br)',
      },
      body: JSON.stringify({ orders: withMelhorEnvioId.map((d) => d.melhor_envio_id) }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Melhor Envio retornou HTTP ${resp.status}: ${errText}`);
    }
    trackingResponse = await resp.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao consultar rastreio na Melhor Envio.';
    for (const d of withMelhorEnvioId) results.push({ deliveryId: d.id, ok: false, error: message });
    sendJson(res, 200, { results });
    return;
  }

  const nowIso = new Date().toISOString();
  const responseByOrderId =
    trackingResponse && typeof trackingResponse === 'object'
      ? (trackingResponse as Record<string, unknown>)
      : {};

  for (const delivery of withMelhorEnvioId) {
    const entry = responseByOrderId[delivery.melhor_envio_id as string];
    const rawStatus = extractStatusText(entry);

    const patch: Record<string, unknown> = { melhor_envio_last_sync_at: nowIso };
    let mappedStatus: string | null = null;

    if (rawStatus) {
      mappedStatus = mapTrackingStatus(rawStatus);
      if (mappedStatus) {
        patch.status = mappedStatus;
        if (mappedStatus === 'ENTREGUE') patch.data_entrega = nowIso.split('T')[0];
      }
    }

    const { error: updateError } = await userClient
      .from('deliveries')
      .update(patch)
      .eq('id', delivery.id);

    results.push({
      deliveryId: delivery.id,
      ok: !updateError,
      rawStatus: rawStatus ?? undefined,
      mappedStatus,
      error: updateError?.message,
    });
  }

  sendJson(res, 200, { results, raw: trackingResponse });
}
