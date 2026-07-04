import type { IncomingMessage, ServerResponse } from 'http';
import { getValidAccessToken, ME_BASE_URL, ME_USER_AGENT, sendJson } from './_shared.js';

// Endpoint temporario de diagnostico - protegido pelo mesmo CRON_SECRET do
// cron-sync, removido depois de confirmar o nome exato do campo de preco
// do frete na Melhor Envio.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    sendJson(res, 401, { error: 'Não autorizado.' });
    return;
  }

  const accessToken = await getValidAccessToken();
  const resp = await fetch(`${ME_BASE_URL}/api/v2/me/orders?page=1`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': ME_USER_AGENT },
  });
  const body = (await resp.json()) as { data?: Array<Record<string, unknown>> };
  const first = body.data?.[0] ?? {};
  sendJson(res, 200, { keys: Object.keys(first), sample: first });
}
