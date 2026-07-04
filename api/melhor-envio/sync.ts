import type { IncomingMessage, ServerResponse } from 'http';
import {
  getBearerToken,
  getUserClient,
  getValidAccessToken,
  mapTrackingStatus,
  findMelhorEnvioOrder,
  fetchMelhorEnvioOrderDetail,
  computePrevisaoEntrega,
  sendJson,
  readJsonBody,
} from './_shared.js';

interface SyncRequestBody {
  deliveryIds: string[];
}

interface SyncItemResult {
  deliveryId: string;
  ok: boolean;
  rawStatus?: string;
  mappedStatus?: string | null;
  previsao?: string | null;
  error?: string;
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

  const nowIso = new Date().toISOString();

  for (const r of resolved) {
    let orderDetail;
    try {
      orderDetail = await fetchMelhorEnvioOrderDetail(accessToken, r.melhorEnvioId);
    } catch (err) {
      results.push({
        deliveryId: r.delivery.id,
        ok: false,
        error: err instanceof Error ? err.message : 'Falha ao consultar o pedido na Melhor Envio.',
      });
      continue;
    }

    const patch: Record<string, unknown> = { melhor_envio_last_sync_at: nowIso };
    if (r.isNew) {
      patch.melhor_envio_id = r.melhorEnvioId;
      if (!r.delivery.codigo_rastreio && r.trackingCode) patch.codigo_rastreio = r.trackingCode;
    }

    const rawStatus = orderDetail.status;
    const mappedStatus = rawStatus ? mapTrackingStatus(rawStatus) : null;
    if (mappedStatus) {
      patch.status = mappedStatus;
      if (mappedStatus === 'ENTREGUE') {
        patch.data_entrega = (orderDetail.delivered_at ?? nowIso).split(/[ T]/)[0];
      }
    }

    const previsao = computePrevisaoEntrega(orderDetail);
    if (previsao) patch.previsao = previsao;

    const { error: updateError } = await userClient
      .from('deliveries')
      .update(patch)
      .eq('id', r.delivery.id);

    results.push({
      deliveryId: r.delivery.id,
      ok: !updateError,
      rawStatus: rawStatus ?? undefined,
      mappedStatus,
      previsao,
      error: updateError?.message,
    });
  }

  sendJson(res, 200, { results });
}
