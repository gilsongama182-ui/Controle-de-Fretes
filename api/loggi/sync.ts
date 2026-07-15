import type { IncomingMessage, ServerResponse } from 'http';
import {
  getBearerToken,
  getUserClient,
  launchBrowser,
  loginToLoggi,
  scrapeShipments,
  buildShipmentIndex,
  matchAndBuildPatch,
  DeliveryTrackingRow,
  sendJson,
  readJsonBody,
} from './_shared.js';

// Sync manual disparado pelo botão "Sincronizar Loggi" na tela de Gestão de
// Entregas — mesmo formato de resposta do equivalente da Melhor Envio
// (api/melhor-envio/sync.ts), pra reaproveitar a mesma lógica de contagem
// de resultado no frontend. Usa o token de sessão de quem clicou (RLS
// normal), não o service_role do cron automático.
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

  const { data: deliveries, error: fetchError } = await userClient
    .from('deliveries')
    .select('id, codigo_rastreio, melhor_envio_id, previsao')
    .in('id', deliveryIds)
    .returns<DeliveryTrackingRow[]>();

  if (fetchError) {
    sendJson(res, 500, { error: `Não foi possível buscar as entregas: ${fetchError.message}` });
    return;
  }

  const results: SyncItemResult[] = [];

  const browser = await launchBrowser();
  let shipmentIndex;
  try {
    const page = await browser.newPage();
    await page.emulateTimezone('America/Sao_Paulo');
    try {
      await loginToLoggi(page);
      const shipments = await scrapeShipments(page);
      shipmentIndex = buildShipmentIndex(shipments);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao logar/ler o painel da Loggi.';
      for (const id of deliveryIds) results.push({ deliveryId: id, ok: false, error: message });
      sendJson(res, 200, { results });
      return;
    }
  } finally {
    await browser.close();
  }

  const nowIso = new Date().toISOString();

  for (const id of deliveryIds) {
    const delivery = (deliveries ?? []).find((d) => d.id === id);
    if (!delivery) {
      results.push({ deliveryId: id, ok: false, error: 'Entrega não encontrada.' });
      continue;
    }

    const outcome = matchAndBuildPatch(delivery, shipmentIndex, nowIso);
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
      error: updateError?.message,
    });
  }

  sendJson(res, 200, { results });
}
