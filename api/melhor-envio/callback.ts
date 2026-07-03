import type { IncomingMessage, ServerResponse } from 'http';
import { exchangeAuthorizationCode, getServiceRoleClient } from './_shared.js';

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    })
  );
}

function redirectToApp(res: ServerResponse, status: 'connected' | 'error', message?: string) {
  const url = new URL('/', `https://${process.env.VERCEL_URL ?? 'hemmersbach-logistics.vercel.app'}`);
  url.searchParams.set('melhor_envio', status);
  if (message) url.searchParams.set('message', message);
  res.statusCode = 302;
  res.setHeader('Location', url.toString());
  // Limpa o cookie de state, não é mais necessário.
  res.setHeader('Set-Cookie', 'me_oauth_state=; Path=/; HttpOnly; Max-Age=0');
  res.end();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '', 'http://localhost');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(req);

  if (!code || !state || state !== cookies.me_oauth_state) {
    redirectToApp(res, 'error', 'Falha na verificação de segurança (state inválido). Tente conectar novamente.');
    return;
  }

  try {
    const tokenData = await exchangeAuthorizationCode(code);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const supabase = getServiceRoleClient();
    const { error } = await supabase.from('melhor_envio_tokens').upsert({
      id: 'default',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? '',
      token_type: tokenData.token_type ?? null,
      expires_at: expiresAt,
      scope: tokenData.scope ?? null,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    redirectToApp(res, 'connected');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao conectar com a Melhor Envio.';
    redirectToApp(res, 'error', message);
  }
}
