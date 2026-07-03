import type { IncomingMessage, ServerResponse } from 'http';
import { getBearerToken, getUserClient, getServiceRoleClient, sendJson } from './_shared.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    sendJson(res, 401, { error: 'Sessão ausente.' });
    return;
  }

  const userClient = getUserClient(token);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    sendJson(res, 401, { error: 'Sessão inválida.' });
    return;
  }

  const { data: profile } = await userClient
    .from('profiles')
    .select('profile_type')
    .eq('id', userData.user.id)
    .single();

  if (profile?.profile_type !== 'master') {
    sendJson(res, 403, { error: 'Só o master pode ver o status da integração.' });
    return;
  }

  const supabase = getServiceRoleClient();
  const { data: row } = await supabase
    .from('melhor_envio_tokens')
    .select('connected_at, updated_at, expires_at')
    .eq('id', 'default')
    .maybeSingle();

  sendJson(res, 200, {
    connected: !!row,
    connectedAt: row?.connected_at ?? null,
    updatedAt: row?.updated_at ?? null,
  });
}
