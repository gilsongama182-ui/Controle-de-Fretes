import type { IncomingMessage, ServerResponse } from 'http';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DeliveryStatus } from '../../src/types';

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
  scope?: string;
}

// Endpoint de troca/renovação de token do OAuth2 (RFC 6749) — o caminho
// "/oauth/token" já foi confirmado certo (erro "invalid_client" da Melhor
// Envio, não 404). client_id/client_secret vão via HTTP Basic Auth (método
// "client_secret_basic", o padrão recomendado pela RFC 6749 seção 2.3.1) em
// vez de irem no corpo — enviar credenciais no corpo E/OU em formato errado
// gerava exatamente esse erro "Client authentication failed".
async function requestToken(body: Record<string, string>): Promise<MelhorEnvioTokenResponse> {
  const basicAuth = Buffer.from(`${ME_CLIENT_ID}:${ME_CLIENT_SECRET}`).toString('base64');
  const resp = await fetch(`${ME_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams(body).toString(),
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

export const ME_USER_AGENT = 'WLOGIS (suporte@wlogis.com.br)';

export interface MelhorEnvioOrderDetail {
  id: string;
  status: string;
  delivery_min: number | null;
  delivery_max: number | null;
  posted_at: string | null;
  delivered_at: string | null;
  generated_at: string | null;
  created_at: string | null;
  tracking: string | null;
  invoice?: { number?: string | number | null; key?: string | null } | null;
}

interface MelhorEnvioOrdersPage {
  data?: MelhorEnvioOrderDetail[];
  last_page?: number;
}

async function fetchOrdersPage(accessToken: string, page: number): Promise<MelhorEnvioOrdersPage> {
  const resp = await fetch(`${ME_BASE_URL}/api/v2/me/orders?page=${page}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': ME_USER_AGENT },
  });
  if (!resp.ok) return { data: [] };
  return (await resp.json()) as MelhorEnvioOrdersPage;
}

// Busca TODAS as páginas de GET /me/orders — mas só UMA VEZ por chamada de
// sincronização, não uma vez por nota fiscal. Cada item já vem com status,
// prazo em dias úteis, datas do ciclo de vida e a NF-e (invoice.number /
// invoice.key), então uma única varredura serve pra combinar todas as
// entregas selecionadas de uma vez — antes, sincronizar várias notas sem
// "ID Melhor Envio" salvo rescaneava as páginas para cada uma, e com
// muitas notas selecionadas isso estourava o tempo da função (HTTP 504).
// Busca a primeira página pra saber quantas existem, depois busca o resto
// em paralelo. Limite de páginas é só uma proteção contra contas com um
// histórico muito grande de pedidos.
export async function fetchAllMelhorEnvioOrders(accessToken: string, maxPages = 40): Promise<MelhorEnvioOrderDetail[]> {
  const first = await fetchOrdersPage(accessToken, 1);
  const items = [...(first.data ?? [])];
  const lastPage = Math.min(first.last_page ?? 1, maxPages);

  if (lastPage > 1) {
    const remaining = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, i) => fetchOrdersPage(accessToken, i + 2))
    );
    for (const page of remaining) items.push(...(page.data ?? []));
  }

  return items;
}

function parseMelhorEnvioDate(value: string | null): Date | null {
  if (!value) return null;
  // Formato "2026-07-03 17:34:16" — troca o espaço por "T" pra virar ISO
  // 8601 válido em qualquer motor JS (sem isso alguns navegadores/Node
  // recusam a string ou interpretam com fuso errado).
  const parsed = new Date(value.replace(' ', 'T'));
  return isNaN(parsed.getTime()) ? null : parsed;
}

function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay(); // 0 = domingo, 6 = sábado
    if (weekday !== 0 && weekday !== 6) added++;
  }
  return result;
}

// Calcula a previsão de entrega a partir do prazo em dias úteis que a
// Melhor Envio devolve (não existe uma data absoluta de previsão — só um
// intervalo de dias). Usa "delivery_max" (estimativa mais conservadora) a
// partir da data de postagem; se ainda não foi postado, usa a data de
// geração da etiqueta como base (fica mais otimista, mas é a única
// referência disponível até o envio ser postado de fato). Não considera
// feriados, só fins de semana.
export function computePrevisaoEntrega(order: MelhorEnvioOrderDetail): string | null {
  if (order.delivery_max == null) return null;
  const baseDate = parseMelhorEnvioDate(order.posted_at) ?? parseMelhorEnvioDate(order.generated_at) ?? parseMelhorEnvioDate(order.created_at);
  if (!baseDate) return null;
  const forecast = addBusinessDays(baseDate, order.delivery_max);
  return forecast.toISOString().split('T')[0];
}

export interface DeliveryTrackingRow {
  id: string;
  melhor_envio_id: string | null;
  nfe: string;
  chave_acesso_nfe: string | null;
  codigo_rastreio: string | null;
}

export interface MelhorEnvioOrderIndexes {
  byId: Map<string, MelhorEnvioOrderDetail>;
  byInvoiceNumber: Map<string, MelhorEnvioOrderDetail>;
  byInvoiceKey: Map<string, MelhorEnvioOrderDetail>;
}

// Monta os três índices em memória (por ID da Melhor Envio, por número de
// NF-e e por chave de acesso) uma única vez por sincronização — tanto o
// sync manual quanto o cron automático usam o mesmo formato de índice pra
// não duplicar essa lógica de combinação.
export function buildOrderIndexes(orders: MelhorEnvioOrderDetail[]): MelhorEnvioOrderIndexes {
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
  return { byId, byInvoiceNumber, byInvoiceKey };
}

export interface DeliverySyncOutcome {
  ok: boolean;
  rawStatus?: string;
  mappedStatus?: DeliveryStatus | null;
  previsao?: string | null;
  patch?: Record<string, unknown>;
  error?: string;
}

// Combina uma entrega com o pedido correspondente na Melhor Envio (por ID
// já salvo, ou por NF-e/chave de acesso quando ainda não tem ID) e monta o
// patch a ser gravado — usado tanto pelo sync manual (sync.ts) quanto pelo
// cron automático (cron-sync.ts), pra manter as duas rotas sempre com a
// mesma regra de mapeamento.
export function matchAndBuildPatch(
  delivery: DeliveryTrackingRow,
  indexes: MelhorEnvioOrderIndexes,
  nowIso: string
): DeliverySyncOutcome {
  let order: MelhorEnvioOrderDetail | undefined;
  let isNew = false;
  if (delivery.melhor_envio_id) {
    order = indexes.byId.get(delivery.melhor_envio_id);
  } else {
    order =
      indexes.byInvoiceNumber.get(delivery.nfe) ??
      (delivery.chave_acesso_nfe ? indexes.byInvoiceKey.get(delivery.chave_acesso_nfe) : undefined);
    isNew = !!order;
  }

  if (!order) {
    return {
      ok: false,
      error: delivery.melhor_envio_id
        ? 'Pedido não encontrado na Melhor Envio (ID pode estar desatualizado).'
        : 'Não foi encontrado nenhum pedido na Melhor Envio com essa NF-e.',
    };
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

  return { ok: true, rawStatus, mappedStatus, previsao, patch };
}

// "received" confirmado contra uma resposta real da API de rastreio (23h
// da entrega de teste NF-e 5548 — status "Postado no Ponto Parceiro" no
// painel da Melhor Envio). Os demais são inferência sobre o vocabulário
// típico de rastreio e ainda não foram vistos numa resposta real — por
// isso qualquer status não reconhecido retorna null de propósito, pra
// nunca sobrescrever o status de uma entrega com um valor adivinhado.
export function mapTrackingStatus(meStatus: string): DeliveryStatus | null {
  const s = meStatus.toLowerCase();
  if (s.includes('delivered') || s.includes('entregue')) return 'ENTREGUE';
  if (s.includes('undelivered') || s.includes('devolvido') || s.includes('returned') || s.includes('failed')) return 'FALHA';
  if (
    s.includes('received') ||
    s.includes('posted') ||
    s.includes('transit') ||
    s.includes('postado') ||
    s.includes('released') ||
    s.includes('generated')
  ) return 'EM ROTA';
  return null;
}
