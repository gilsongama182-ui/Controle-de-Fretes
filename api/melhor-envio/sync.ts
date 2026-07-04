import type { IncomingMessage, ServerResponse } from 'http';
import {
  getBearerToken,
  getUserClient,
  getValidAccessToken,
  mapTrackingStatus,
  findMelhorEnvioOrder,
  sendJson,
  readJsonBody,
  ME_BASE_URL,
  ME_USER_AGENT,
} from './_shared.js';

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

interface DeliveryRow {
  id: string;
  melhor_envio_id: string | null;
  nfe: string;
  chave_acesso_nfe: string | null;
  codigo_rastreio: string | null;
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
    .select('id, melhor_envio_id, nfe, chave_acesso_nfe, codigo_rastreio')
    .in('id', deliveryIds)
    .returns<DeliveryRow[]>();

  if (fetchError) {
    sendJson(res, 500, { error: `Não foi possível buscar as entregas: ${fetchError.message}` });
    return;
  }

  const results: SyncItemResult[] = [];

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao obter token da Melhor Envio.';
    for (const id of deliveryIds) results.push({ deliveryId: id, ok: false, error: message });
    sendJson(res, 200, { results });
    return;
  }

  // Pra quem não tem "ID Melhor Envio" salvo, tenta achar automaticamente
  // combinando pelo número ou chave de acesso da NF-e (campo "invoice" do
  // pedido na Melhor Envio) — assim o operador não precisa caçar o UUID
  // manualmente no painel deles.
  const resolved: { delivery: DeliveryRow; melhorEnvioId: string; trackingCode: string | null; isNew: boolean }[] = [];

  for (const delivery of deliveries ?? []) {
    if (delivery.melhor_envio_id) {
      resolved.push({ delivery, melhorEnvioId: delivery.melhor_envio_id, trackingCode: null, isNew: false });
      continue;
    }

    try {
      const match = await findMelhorEnvioOrder(accessToken, {
        nfe: delivery.nfe,
        chaveAcessoNfe: delivery.chave_acesso_nfe ?? '',
      });
      if (match) {
        resolved.push({ delivery, melhorEnvioId: match.id, trackingCode: match.trackingCode, isNew: true });
      } else {
        results.push({
          deliveryId: delivery.id,
          ok: false,
          error: 'Não foi encontrado nenhum pedido na Melhor Envio com essa NF-e.',
        });
      }
    } catch (err) {
      results.push({
        deliveryId: delivery.id,
        ok: false,
        error: err instanceof Error ? `Falha ao buscar o pedido: ${err.message}` : 'Falha ao buscar o pedido na Melhor Envio.',
      });
    }
  }

  for (const id of deliveryIds) {
    if (!(deliveries ?? []).some((d) => d.id === id) && !results.some((r) => r.deliveryId === id)) {
      results.push({ deliveryId: id, ok: false, error: 'Entrega não encontrada.' });
    }
  }

  if (resolved.length === 0) {
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
        'User-Agent': ME_USER_AGENT,
      },
      body: JSON.stringify({ orders: resolved.map((r) => r.melhorEnvioId) }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Melhor Envio retornou HTTP ${resp.status}: ${errText}`);
    }
    trackingResponse = await resp.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao consultar rastreio na Melhor Envio.';
    for (const r of resolved) results.push({ deliveryId: r.delivery.id, ok: false, error: message });
    sendJson(res, 200, { results });
    return;
  }

  const nowIso = new Date().toISOString();
  const responseByOrderId =
    trackingResponse && typeof trackingResponse === 'object'
      ? (trackingResponse as Record<string, unknown>)
      : {};

  for (const r of resolved) {
    const entry = responseByOrderId[r.melhorEnvioId];
    const rawStatus = extractStatusText(entry);

    const patch: Record<string, unknown> = { melhor_envio_last_sync_at: nowIso };
    if (r.isNew) {
      patch.melhor_envio_id = r.melhorEnvioId;
      if (!r.delivery.codigo_rastreio && r.trackingCode) patch.codigo_rastreio = r.trackingCode;
    }

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
      .eq('id', r.delivery.id);

    results.push({
      deliveryId: r.delivery.id,
      ok: !updateError,
      rawStatus: rawStatus ?? undefined,
      mappedStatus,
      error: updateError?.message,
    });
  }

  sendJson(res, 200, { results, raw: trackingResponse });
}
