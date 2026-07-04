import type { IncomingMessage, ServerResponse } from 'http';
import {
  getServiceRoleClient,
  getValidAccessToken,
  fetchAllMelhorEnvioOrders,
  buildOrderIndexes,
  matchAndBuildPatch,
  DeliveryTrackingRow,
  sendJson,
} from './_shared.js';

// Disparado pelo Vercel Cron (vercel.json -> crons), sem sessão de usuário
// nenhuma — por isso usa service_role pra ler/gravar em "deliveries" (única
// rota do projeto que faz isso; o sync manual em sync.ts continua usando o
// token da sessão de quem clicou, respeitando a RLS normal). O Vercel injeta
// automaticamente "Authorization: Bearer CRON_SECRET" nessa chamada quando a
// env var CRON_SECRET está configurada — é assim que barramos qualquer
// chamada externa direta a essa URL.
const MAX_DELIVERIES_PER_RUN = 300;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    sendJson(res, 401, { error: 'Não autorizado.' });
    return;
  }

  const supabase = getServiceRoleClient();

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    sendJson(res, 200, { checked: 0, updated: 0, error: err instanceof Error ? err.message : 'Falha ao obter token.' });
    return;
  }

  // Só busca entregas ainda não finalizadas — como a base cresce com o
  // tempo, não faz sentido reconsultar pra sempre notas já ENTREGUE/FALHA.
  const { data: deliveries, error: fetchError } = await supabase
    .from('deliveries')
    .select('id, melhor_envio_id, nfe, chave_acesso_nfe, codigo_rastreio')
    .in('status', ['EM ROTA', 'EM ATRASO'])
    .limit(MAX_DELIVERIES_PER_RUN)
    .returns<DeliveryTrackingRow[]>();

  if (fetchError) {
    sendJson(res, 200, { checked: 0, updated: 0, error: fetchError.message });
    return;
  }
  if (!deliveries || deliveries.length === 0) {
    sendJson(res, 200, { checked: 0, updated: 0 });
    return;
  }

  let orders;
  try {
    orders = await fetchAllMelhorEnvioOrders(accessToken);
  } catch (err) {
    sendJson(res, 200, { checked: deliveries.length, updated: 0, error: err instanceof Error ? err.message : 'Falha ao buscar pedidos.' });
    return;
  }

  const indexes = buildOrderIndexes(orders);
  const nowIso = new Date().toISOString();

  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    const outcome = matchAndBuildPatch(delivery, indexes, nowIso);
    if (!outcome.ok || !outcome.patch) {
      notFound++;
      continue;
    }
    const { error: updateError } = await supabase.from('deliveries').update(outcome.patch).eq('id', delivery.id);
    if (updateError) failed++;
    else updated++;
  }

  sendJson(res, 200, { checked: deliveries.length, updated, notFound, failed });
}
