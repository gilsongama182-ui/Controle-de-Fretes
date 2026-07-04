import type { IncomingMessage, ServerResponse } from 'http';
import {
  getBearerToken,
  getUserClient,
  getValidAccessToken,
  mapTrackingStatus,
  fetchAllMelhorEnvioOrders,
  computePrevisaoEntrega,
  MelhorEnvioOrderDetail,
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

  // Uma única varredura de pedidos serve pra combinar TODAS as entregas
  // selecionadas — não é mais feita uma busca por nota fiscal.
  let orders: MelhorEnvioOrderDetail[];
  try {
    orders = await fetchAllMelhorEnvioOrders(accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao buscar pedidos na Melhor Envio.';
    for (const id of deliveryIds) results.push({ deliveryId: id, ok: false, error: message });
    sendJson(res, 200, { results });
    return;
  }

  const byId = new Map<string, MelhorEnvioOrderDetail>();
  const byInvoiceNumber = new Map<string, MelhorEnvioOrderDetail>();
  const byInvoiceKey = new Map<string, MelhorEnvioOrderDetail>();
  for (const order of orders) {
    byId.set(order.id, order);
    const num = order.invoice?.number != null ? String(order.invoice.number) : null;
    const key = order.invoice?.key ?? null;
    if (num && !byInvoiceNumber.has(num)) byInvoiceNumber.set(num, order);
    if (key && !byInvoiceKey.has(key)) byInvoiceKey.set(key, order);
  }

  const nowIso = new Date().toISOString();

  for (const id of deliveryIds) {
    const delivery = (deliveries ?? []).find((d) => d.id === id);
    if (!delivery) {
      results.push({ deliveryId: id, ok: false, error: 'Entrega não encontrada.' });
      continue;
    }

    let order: MelhorEnvioOrderDetail | undefined;
    let isNew = false;
    if (delivery.melhor_envio_id) {
      order = byId.get(delivery.melhor_envio_id);
    } else {
      order = byInvoiceNumber.get(delivery.nfe) ?? (delivery.chave_acesso_nfe ? byInvoiceKey.get(delivery.chave_acesso_nfe) : undefined);
      isNew = !!order;
    }

    if (!order) {
      results.push({
        deliveryId: delivery.id,
        ok: false,
        error: delivery.melhor_envio_id
          ? 'Pedido não encontrado na Melhor Envio (ID pode estar desatualizado).'
          : 'Não foi encontrado nenhum pedido na Melhor Envio com essa NF-e.',
      });
      continue;
    }

    const patch: Record<string, unknown> = { melhor_envio_last_sync_at: nowIso };
    if (isNew) {
      patch.melhor_envio_id = order.id;
      if (!delivery.codigo_rastreio && order.tracking) patch.codigo_rastreio = order.tracking;
    }

    const rawStatus = order.status;
    const mappedStatus = rawStatus ? mapTrackingStatus(rawStatus) : null;
    if (mappedStatus) {
      patch.status = mappedStatus;
      if (mappedStatus === 'ENTREGUE') {
        patch.data_entrega = (order.delivered_at ?? nowIso).split(/[ T]/)[0];
      }
    }

    const previsao = computePrevisaoEntrega(order);
    if (previsao) patch.previsao = previsao;

    const { error: updateError } = await userClient
      .from('deliveries')
      .update(patch)
      .eq('id', delivery.id);

    results.push({
      deliveryId: delivery.id,
      ok: !updateError,
      rawStatus: rawStatus ?? undefined,
      mappedStatus,
      previsao,
      error: updateError?.message,
    });
  }

  sendJson(res, 200, { results });
}
