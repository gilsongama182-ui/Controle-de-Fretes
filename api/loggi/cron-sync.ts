import type { IncomingMessage, ServerResponse } from 'http';
import {
  getServiceRoleClient,
  launchBrowser,
  loginToLoggi,
  scrapeShipments,
  buildShipmentIndex,
  matchAndBuildPatch,
  captureDebug,
  readAuthorized,
  DeliveryTrackingRow,
  sendJson,
} from './_shared.js';

// Disparado pelo Vercel Cron (vercel.json -> crons), sem sessão de usuário
// nenhuma — mesmo padrão de api/melhor-envio/cron-sync.ts: usa service_role
// pra ler/gravar em "deliveries", e o Vercel injeta automaticamente
// "Authorization: Bearer CRON_SECRET" (a mesma env var já usada pela
// Melhor Envio, reaproveitada aqui).
//
// Diferente da Melhor Envio, aqui não é uma chamada REST — é login real via
// navegador headless, então o browser é aberto e a lista é lida UMA vez só
// por execução, e todas as entregas candidatas são casadas contra essa
// mesma leitura (login por entrega seria inviável).
const MAX_DELIVERIES_PER_RUN = 300;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!readAuthorized(req)) {
    sendJson(res, 401, { error: 'Não autorizado.' });
    return;
  }

  const supabase = getServiceRoleClient();

  // Só reconsulta entregas ainda não finalizadas e que já têm um código de
  // rastreio pra casar contra o painel da Loggi. "melhor_envio_id is null"
  // é uma trava extra de segurança (o usuário confirmou que hoje uma
  // entrega nunca está nas duas integrações ao mesmo tempo, mas evita que
  // os dois crons brigem pelo mesmo campo status se isso mudar no futuro).
  const { data: deliveries, error: fetchError } = await supabase
    .from('deliveries')
    .select('id, codigo_rastreio, melhor_envio_id')
    .in('status', ['EM ROTA', 'EM ATRASO'])
    .not('codigo_rastreio', 'is', null)
    .is('melhor_envio_id', null)
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

  // ?debug=1 tira screenshot + HTML de onde travou e devolve na resposta,
  // pra dar pra ajustar os seletores sem precisar de acesso à conta da
  // Loggi. Não fica ligado por padrão pra não pesar a resposta do cron
  // automático depois que estiver tudo ajustado.
  const debugMode = !!req.url && req.url.includes('debug=1');

  const browser = await launchBrowser();
  let shipmentIndex;
  try {
    const page = await browser.newPage();
    let afterLoginDebug = null;
    try {
      await loginToLoggi(page);
      if (debugMode) afterLoginDebug = await captureDebug(page).catch(() => null);
      const shipments = await scrapeShipments(page);
      shipmentIndex = buildShipmentIndex(shipments);
    } catch (err) {
      const debug = debugMode ? await captureDebug(page).catch(() => null) : null;
      sendJson(res, 200, {
        checked: deliveries.length,
        updated: 0,
        error: err instanceof Error ? err.message : 'Falha ao logar/ler o painel da Loggi.',
        afterLoginDebug,
        debug,
      });
      return;
    }
  } finally {
    await browser.close();
  }

  const nowIso = new Date().toISOString();
  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    const outcome = matchAndBuildPatch(delivery, shipmentIndex, nowIso);
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
