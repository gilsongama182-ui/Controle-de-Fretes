import type { IncomingMessage, ServerResponse } from 'http';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DeliveryStatus } from '../../src/types';

// Funções server-only compartilhadas pelas rotas de /api/melhor-envio.
// Nunca importar este arquivo (nem nada dentro de api/) de código do
// navegador — ele usa a SUPABASE_SERVICE_ROLE_KEY, que não pode vazar
// pro bundle do frontend.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const ME_CLIENT_ID = process.env.MELHOR_ENVIO_CLIENT_ID as string;
export const ME_CLIENT_SECRET = process.env.MELHOR_ENVIO_CLIENT_SECRET as string;
export const ME_REDIRECT_URI = process.env.MELHOR_ENVIO_REDIRECT_URI as string;

// sandbox por padrão — só usa produção se MELHOR_ENVIO_ENV="production" for
// explicitamente configurado no Vercel.
export const ME_BASE_URL =
  process.env.MELHOR_ENVIO_ENV === 'production'
    ? 'https://melhorenvio.com.br'
    : 'https://sandbox.melhorenvio.com.br';

export function getServiceRoleClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Cliente autenticado com o token de sessão de quem chamou a função —
// respeita a RLS normal de "deliveries" (a mesma que já protege a tela
// de Gestão de Entregas), sem precisar de service_role pra essa escrita.
export function getUserClient(accessToken: string): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL ou SUPABASE_ANON_KEY não configurada no ambiente.');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function getBearerToken(req: IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length);
}

export function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

interface MelhorEnvioTokenRow {
  id: string;
  access_token: string;
  refresh_token: string;
  token_type: string | null;
  expires_at: string;
}

interface MelhorEnvioTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in: number;
}

// Endpoint de troca/renovação de token do OAuth2 (RFC 6749) — o padrão
// que a própria Melhor Envio segue no endpoint de autorização confirmado
// em docs.melhorenvio.com.br/reference/fluxo-de-autorização. O caminho
// exato "/oauth/token" e o formato do corpo NÃO foram confirmados na
// documentação pública (ela não expõe isso a ferramentas automatizadas) —
// validar no primeiro clique real de "Conectar Melhor Envio" e ajustar
// aqui se a resposta da API vier em formato diferente.
async function requestToken(body: Record<string, string>): Promise<MelhorEnvioTokenResponse> {
  const resp = await fetch(`${ME_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Melhor Envio recusou a requisição de token (HTTP ${resp.status}): ${errText}`);
  }
  return (await resp.json()) as MelhorEnvioTokenResponse;
}

export async function exchangeAuthorizationCode(code: string): Promise<MelhorEnvioTokenResponse> {
  return requestToken({
    grant_type: 'authorization_code',
    client_id: ME_CLIENT_ID,
    client_secret: ME_CLIENT_SECRET,
    redirect_uri: ME_REDIRECT_URI,
    code,
  });
}

// Garante um access_token válido, renovando via refresh_token quando
// estiver a menos de 5 minutos de expirar (ou já expirado).
export async function getValidAccessToken(): Promise<string> {
  const supabase = getServiceRoleClient();
  const { data: row, error } = await supabase
    .from('melhor_envio_tokens')
    .select('*')
    .eq('id', 'default')
    .maybeSingle<MelhorEnvioTokenRow>();

  if (error) throw error;
  if (!row) throw new Error('Conta Melhor Envio ainda não conectada. Conecte na tela de Integrações.');

  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt - Date.now() > 5 * 60 * 1000) {
    return row.access_token;
  }

  const tokenData = await requestToken({
    grant_type: 'refresh_token',
    client_id: ME_CLIENT_ID,
    client_secret: ME_CLIENT_SECRET,
    refresh_token: row.refresh_token,
  });

  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  await supabase
    .from('melhor_envio_tokens')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? row.refresh_token,
      token_type: tokenData.token_type ?? row.token_type,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default');

  return tokenData.access_token;
}

// Mapeamento RASCUNHO — não confirmado contra uma resposta real da API de
// rastreio (ver plano da integração). Qualquer status não reconhecido
// retorna null de propósito, pra nunca sobrescrever o status de uma
// entrega com um valor adivinhado.
export function mapTrackingStatus(meStatus: string): DeliveryStatus | null {
  const s = meStatus.toLowerCase();
  if (s.includes('delivered') || s.includes('entregue')) return 'ENTREGUE';
  if (s.includes('undelivered') || s.includes('devolvido') || s.includes('returned') || s.includes('failed')) return 'FALHA';
  if (s.includes('posted') || s.includes('transit') || s.includes('postado') || s.includes('released') || s.includes('generated')) return 'EM ROTA';
  return null;
}
