import type { IncomingMessage, ServerResponse } from 'http';
import { getBearerToken, getUserClient, getValidAccessToken, sendJson, ME_BASE_URL } from './_shared.js';

// Endpoint temporário de diagnóstico (master-only) — testa o token atual
// contra alguns endpoints da Melhor Envio pra isolar se o 403 é geral
// (token sem nenhuma permissão) ou específico do endpoint de rastreio.
// Remover depois que o problema for resolvido.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const token = getBearerToken(req);
  if (!token) {
    sendJson(res, 401, { error: 'Sessão ausente.' });
    return;
  }

  const userClient = getUserClient(token);
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) {
    sendJson(res, 401, { error: 'Sessão inválida.' });
    return;
  }
  const { data: profile } = await userClient.from('profiles').select('profile_type').eq('id', userData.user.id).single();
  if (profile?.profile_type !== 'master') {
    sendJson(res, 403, { error: 'Só o master pode usar isso.' });
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    sendJson(res, 200, { error: err instanceof Error ? err.message : String(err) });
    return;
  }

  const userAgent = 'WLOGIS (suporte@wlogis.com.br)';
  const checks: Record<string, unknown> = {};

  for (const [name, path, method] of [
    ['me', '/api/v2/me', 'GET'],
    ['companies', '/api/v2/me/shipment/companies', 'GET'],
    ['orders', '/api/v2/me/orders', 'GET'],
  ] as const) {
    try {
      const resp = await fetch(`${ME_BASE_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': userAgent },
      });
      const text = await resp.text();
      checks[name] = { status: resp.status, body: text.slice(0, 500) };
    } catch (err) {
      checks[name] = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  sendJson(res, 200, { baseUrl: ME_BASE_URL, checks });
}
