import type { IncomingMessage, ServerResponse } from 'http';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import type { DeliveryStatus } from '../../src/types';

// Funções server-only compartilhadas pelas rotas de /api/loggi. Nunca
// importar este arquivo de código do navegador — usa a
// SUPABASE_SERVICE_ROLE_KEY e o login real da Loggi, que não podem vazar
// pro bundle do frontend.
//
// AVISO: a Loggi não tem API pública pra essa conta, então essa integração
// loga no site com usuário/senha via navegador headless e "lê a tela"
// (scraping). Diferente da integração com a Melhor Envio (OAuth oficial),
// isso é inerentemente frágil: quebra se a Loggi mudar o layout/copy do
// site, e os seletores abaixo foram escritos a partir de uma inspeção
// parcial (sem login real) — espere precisar ajustar depois do primeiro
// teste contra o site de verdade.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const LOGGI_LOGIN_EMAIL = process.env.LOGGI_LOGIN_EMAIL as string;
const LOGGI_LOGIN_PASSWORD = process.env.LOGGI_LOGIN_PASSWORD as string;

// URL confirmada via inspeção pública do site (app.loggi.com/entrar). A tela
// de envios já exige login, então essa URL é um palpite — ajustar via env
// var (sem precisar de deploy) assim que o caminho real for confirmado.
const LOGGI_LOGIN_URL = process.env.LOGGI_LOGIN_URL || 'https://app.loggi.com/entrar';
const LOGGI_SHIPMENTS_URL = process.env.LOGGI_SHIPMENTS_URL || 'https://app.loggi.com/envios';

// A tela de login da Loggi é em duas etapas (e-mail -> "Continuar" -> senha
// aparece -> "Continuar" de novo), não um formulário único. Os textos dos
// botões são configuráveis por env var pro caso de mudarem sem precisar de
// deploy novo.
const LOGGI_CONTINUE_BUTTON_TEXT = process.env.LOGGI_CONTINUE_BUTTON_TEXT || 'Continuar';

// Seletores da lista de envios — 100% um palpite, não há como inspecionar
// a tela sem estar logado. Pensados pra serem ajustados via env var durante
// o primeiro teste manual (ver PASSO 3 do plano), sem precisar redeployar.
const LOGGI_ROW_SELECTOR = process.env.LOGGI_ROW_SELECTOR || '[data-testid="shipment-row"], tr[data-shipment], li[data-shipment]';
const LOGGI_TRACKING_SELECTOR = process.env.LOGGI_TRACKING_SELECTOR || '[data-testid="tracking-code"]';
const LOGGI_STATUS_SELECTOR = process.env.LOGGI_STATUS_SELECTOR || '[data-testid="shipment-status"]';

const NAV_TIMEOUT_MS = 30000;

export function getServiceRoleClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export interface DeliveryTrackingRow {
  id: string;
  codigo_rastreio: string | null;
  melhor_envio_id: string | null;
}

export interface LoggiShipment {
  trackingCode: string;
  rawStatus: string;
}

// Pacote pré-compilado do Chromium hospedado nos releases do próprio
// @sparticuz/chromium — usar a variante "-min" (sem o binário embutido no
// bundle) é o que a própria Vercel recomenda pra não estourar o limite de
// tamanho de function (250MB); o binário é baixado desse link só na
// primeira invocação "fria" e fica em cache em /tmp nas seguintes.
const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar';

export async function launchBrowser(): Promise<Browser> {
  chromium.setGraphicsMode = false;
  return puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
    executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
    headless: 'shell',
  });
}

// Login em duas etapas: e-mail -> Continuar -> senha aparece -> Continuar.
// Lança erro descritivo em cada etapa que falhar, pra facilitar diagnóstico
// pelos logs da function na Vercel durante o ajuste inicial.
export async function loginToLoggi(page: Page): Promise<void> {
  if (!LOGGI_LOGIN_EMAIL || !LOGGI_LOGIN_PASSWORD) {
    throw new Error('LOGGI_LOGIN_EMAIL ou LOGGI_LOGIN_PASSWORD não configurada no ambiente.');
  }

  await page.goto(LOGGI_LOGIN_URL, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });

  const emailInput = await page.waitForSelector('input[type="email"]', { timeout: NAV_TIMEOUT_MS });
  if (!emailInput) throw new Error('Campo de e-mail não encontrado na tela de login da Loggi.');
  await emailInput.type(LOGGI_LOGIN_EMAIL, { delay: 20 });

  await clickButtonByText(page, LOGGI_CONTINUE_BUTTON_TEXT, 'depois de preencher o e-mail');

  const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: NAV_TIMEOUT_MS });
  if (!passwordInput) throw new Error('Campo de senha não apareceu depois de informar o e-mail.');
  await passwordInput.type(LOGGI_LOGIN_PASSWORD, { delay: 20 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS }).catch(() => null),
    clickButtonByText(page, LOGGI_CONTINUE_BUTTON_TEXT, 'depois de preencher a senha'),
  ]);
}

async function clickButtonByText(page: Page, text: string, contexto: string): Promise<void> {
  const handle = await page.waitForSelector(`text/${text}`, { timeout: NAV_TIMEOUT_MS }).catch(() => null);
  if (!handle) throw new Error(`Botão "${text}" não encontrado (${contexto}).`);
  await handle.click();
}

// Lê a lista/painel de envios já logado. Se a Loggi paginar a lista, essa
// função só lê a primeira página — ajustar aqui se for preciso "carregar
// mais"/paginar quando os seletores reais forem confirmados.
export async function scrapeShipments(page: Page): Promise<LoggiShipment[]> {
  await page.goto(LOGGI_SHIPMENTS_URL, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
  await page.waitForSelector(LOGGI_ROW_SELECTOR, { timeout: NAV_TIMEOUT_MS });

  return page.$$eval(
    LOGGI_ROW_SELECTOR,
    (rows, trackingSelector, statusSelector) =>
      rows
        .map((row) => {
          const trackingEl = row.querySelector(trackingSelector);
          const statusEl = row.querySelector(statusSelector);
          const trackingCode = trackingEl?.textContent?.trim() ?? '';
          const rawStatus = statusEl?.textContent?.trim() ?? '';
          return { trackingCode, rawStatus };
        })
        .filter((s) => s.trackingCode && s.rawStatus),
    LOGGI_TRACKING_SELECTOR,
    LOGGI_STATUS_SELECTOR
  );
}

export function buildShipmentIndex(shipments: LoggiShipment[]): Map<string, LoggiShipment> {
  const byTrackingCode = new Map<string, LoggiShipment>();
  for (const shipment of shipments) {
    if (!byTrackingCode.has(shipment.trackingCode)) byTrackingCode.set(shipment.trackingCode, shipment);
  }
  return byTrackingCode;
}

export interface DeliverySyncOutcome {
  ok: boolean;
  rawStatus?: string;
  mappedStatus?: DeliveryStatus | null;
  patch?: Record<string, unknown>;
  error?: string;
}

// Mesmo espírito do matchAndBuildPatch da Melhor Envio
// (api/melhor-envio/_shared.ts): casa por codigo_rastreio (único
// identificador confirmado pelo usuário que aparece nos dois lugares) e só
// grava status quando o mapeamento é reconhecido — nunca sobrescreve com um
// valor adivinhado.
export function matchAndBuildPatch(
  delivery: DeliveryTrackingRow,
  shipmentsByTrackingCode: Map<string, LoggiShipment>,
  nowIso: string
): DeliverySyncOutcome {
  if (!delivery.codigo_rastreio) {
    return { ok: false, error: 'Entrega sem código de rastreio cadastrado.' };
  }

  const shipment = shipmentsByTrackingCode.get(delivery.codigo_rastreio);
  if (!shipment) {
    return { ok: false, error: 'Código de rastreio não encontrado no painel da Loggi.' };
  }

  const mappedStatus = mapLoggiStatus(shipment.rawStatus);
  const patch: Record<string, unknown> = { loggi_last_sync_at: nowIso };
  if (mappedStatus) {
    patch.status = mappedStatus;
    if (mappedStatus === 'ENTREGUE') patch.data_entrega = nowIso.split('T')[0];
  }

  return { ok: true, rawStatus: shipment.rawStatus, mappedStatus, patch };
}

// Vocabulário inferido, nunca visto numa resposta real da Loggi ainda —
// qualquer status não reconhecido retorna null de propósito (só atualiza
// loggi_last_sync_at), pra nunca sobrescrever o status de uma entrega com
// um valor adivinhado errado. Ajustar aqui assim que os status reais
// aparecerem nos logs do primeiro teste manual.
export function mapLoggiStatus(loggiStatus: string): DeliveryStatus | null {
  const s = loggiStatus.toLowerCase();
  if (s.includes('entregue')) return 'ENTREGUE';
  if (s.includes('devolv')) return 'DEVOLVIDO';
  if (s.includes('não entregue') || s.includes('nao entregue') || s.includes('falha') || s.includes('insucesso')) return 'FALHA';
  if (s.includes('atraso') || s.includes('atrasad')) return 'EM ATRASO';
  if (s.includes('trânsito') || s.includes('transito') || s.includes('rota') || s.includes('coletad') || s.includes('saiu para entrega')) return 'EM ROTA';
  return null;
}

export function readAuthorized(req: IncomingMessage): boolean {
  const expected = process.env.CRON_SECRET;
  return !!expected && req.headers.authorization === `Bearer ${expected}`;
}
