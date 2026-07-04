import type { IncomingMessage, ServerResponse } from 'http';
import {
  getBearerToken,
  getUserClient,
  getValidAccessToken,
  fetchAllMelhorEnvioOrders,
  buildOrderIndexes,
  matchAndBuildPatch,
  DeliveryTrackingRow,
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
    .returns<DeliveryTrackingRow[]>();

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
  let orders;
  try {
    orders = await fetchAllMelhorEnvioOrders(accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao buscar pedidos na Melhor Envio.';
    for (const id of deliveryIds) results.push({ deliveryId: id, ok: false, error: message });
    sendJson(res, 200, { results });
    return;
  }

  const indexes = buildOrderIndexes(orders);
  const nowIso = new Date().toISOString();

  for (const id of deliveryIds) {
    const delivery = (deliveries ?? []).find((d) => d.id === id);
    if (!delivery) {
      results.push({ deliveryId: id, ok: false, error: 'Entrega não encontrada.' });
      continue;
    }

    const outcome = matchAndBuildPatch(delivery, indexes, nowIso);
    if (!outcome.ok || !outcome.patch) {
      results.push({ deliveryId: delivery.id, ok: false, error: outcome.error });
      continue;
    }

    const { error: updateError } = await userClient
      .from('deliveries')
      .update(outcome.patch)
      .eq('id', delivery.id);

    results.push({
      deliveryId: delivery.id,
      ok: !updateError,
      rawStatus: outcome.rawStatus,
      mappedStatus: outcome.mappedStatus,
      previsao: outcome.previsao,
      error: updateError?.message,
    });
  }

  sendJson(res, 200, { results });
}
