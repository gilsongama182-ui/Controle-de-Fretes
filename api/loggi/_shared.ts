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

// URL confirmada via inspeção pública do site (app.loggi.com/entrar).
const LOGGI_LOGIN_URL = process.env.LOGGI_LOGIN_URL || 'https://app.loggi.com/entrar';

// A tela de login da Loggi é em duas etapas (e-mail -> "Continuar" -> senha
// aparece -> "Continuar" de novo), não um formulário único. Os textos dos
// botões são configuráveis por env var pro caso de mudarem sem precisar de
// deploy novo.
const LOGGI_CONTINUE_BUTTON_TEXT = process.env.LOGGI_CONTINUE_BUTTON_TEXT || 'Continuar';

// A lista de envios não tem URL fixa nem link <a href> — é uma SPA que
// navega clicando no menu lateral (confirmado via debug: seção
// "ACOMPANHAMENTO" com os itens "Envios nacionais"/"Envios locais", sem
// href nem data-testid). Por isso navega clicando no texto do menu, igual
// já é feito nos botões de login.
const LOGGI_SHIPMENTS_MENU_TEXT = process.env.LOGGI_SHIPMENTS_MENU_TEXT || 'Envios nacionais';

// Confirmados inspecionando o HTML real da tabela (MUI Table — sem
// data-testid por linha): cada linha é um <tr> dentro do <tbody>, e a 5ª
// coluna é o código de rastreio, a 6ª é o status. Continuam configuráveis
// por env var pro caso da Loggi mudar o layout de novo sem precisar de
// deploy pra corrigir.
const LOGGI_ROW_SELECTOR = process.env.LOGGI_ROW_SELECTOR || 'tbody tr.MuiTableRow-root';
const LOGGI_TRACKING_SELECTOR = process.env.LOGGI_TRACKING_SELECTOR || 'td:nth-child(5)';
const LOGGI_STATUS_SELECTOR = process.env.LOGGI_STATUS_SELECTOR || 'td:nth-child(6)';

// Curto de propósito: a function tem 60s no total (maxDuration, limite do
// plano da Vercel) e passa por várias esperas em sequência (login,
// navegação pro menu, seletor da lista) — precisa sobrar margem pra todas.
const NAV_TIMEOUT_MS = 12000;

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
// domcontentloaded dispara antes do React "hidratar" (anexar os handlers
// de onChange/validação), então digitar imediatamente depois pode cair num
// campo que ainda não está de fato interativo — daí essas pausas curtas
// depois de cada carregamento/navegação, sem voltar a depender de rede
// ociosa (networkidle2), que trava com o tanto de script de marketing que
// a página carrega.
function settle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginToLoggi(page: Page): Promise<void> {
  if (!LOGGI_LOGIN_EMAIL || !LOGGI_LOGIN_PASSWORD) {
    throw new Error('LOGGI_LOGIN_EMAIL ou LOGGI_LOGIN_PASSWORD não configurada no ambiente.');
  }

  await page.goto(LOGGI_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });

  // A transição e-mail -> senha é intermitente (timing de hidratação varia
  // de execução pra execução), então tenta de novo uma vez antes de desistir
  // — confere se o valor digitado realmente "colou" no campo antes de
  // clicar Continuar, e se a senha não aparecer, refaz o passo do e-mail.
  let passwordInput = null;
  for (let attempt = 1; attempt <= 2 && !passwordInput; attempt++) {
    const emailInput = await page.waitForSelector('input[type="email"]', { timeout: NAV_TIMEOUT_MS });
    if (!emailInput) throw new Error('Campo de e-mail não encontrado na tela de login da Loggi.');
    await settle(attempt === 1 ? 800 : 1500);
    await emailInput.click();
    await emailInput.evaluate((el) => {
      (el as HTMLInputElement).value = '';
    });
    await emailInput.type(LOGGI_LOGIN_EMAIL, { delay: 40 });

    const typedValue = await emailInput.evaluate((el) => (el as HTMLInputElement).value);
    if (typedValue !== LOGGI_LOGIN_EMAIL) {
      continue; // valor não colou (campo ainda não hidratado) — tenta de novo
    }
    await settle(300);

    await clickButtonByText(page, LOGGI_CONTINUE_BUTTON_TEXT, 'depois de preencher o e-mail');
    await settle(800);

    passwordInput = await page.waitForSelector('input[type="password"]', { timeout: NAV_TIMEOUT_MS }).catch(() => null);
  }
  if (!passwordInput) throw new Error('Campo de senha não apareceu depois de informar o e-mail (mesmo após tentar de novo).');
  await passwordInput.click();
  await passwordInput.type(LOGGI_LOGIN_PASSWORD, { delay: 30 });
  await settle(300);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }).catch(() => null),
    clickButtonByText(page, LOGGI_CONTINUE_BUTTON_TEXT, 'depois de preencher a senha'),
  ]);
  await settle(800);
}

async function clickButtonByText(page: Page, text: string, contexto: string): Promise<void> {
  const handle = await page.waitForSelector(`text/${text}`, { timeout: NAV_TIMEOUT_MS }).catch(() => null);
  if (!handle) throw new Error(`Botão "${text}" não encontrado (${contexto}).`);
  await handle.click();
}

export interface DebugCapture {
  url: string;
  screenshotBase64: string;
  htmlSnippet: string;
  links: { href: string; text: string }[];
  bodyText: string;
  testIds: { testId: string; text: string }[];
  rowHtmlSample: string;
}

// Só chamada quando o run é disparado com ?debug=1 (ver cron-sync.ts) — tira
// uma "foto" de onde o scraper travou (screenshot + HTML + lista de links)
// pra dar pra inspecionar e ajustar os seletores sem precisar de acesso
// direto à conta da Loggi. HTML truncado pra não estourar o tamanho da
// resposta; a lista de links (menu de navegação, em geral) é o mais útil
// pra achar a URL real de uma tela sem precisar rolar HTML cru.
export async function captureDebug(page: Page): Promise<DebugCapture> {
  const screenshotBase64 = (await page.screenshot({ encoding: 'base64', type: 'png' })) as string;
  const html = await page.content();
  const links = await page
    .$$eval('a[href]', (anchors) =>
      anchors
        .map((a) => ({ href: (a as HTMLAnchorElement).href, text: (a.textContent ?? '').trim() }))
        .filter((l) => l.text)
    )
    .catch(() => []);
  // Sidebars de SPA costumam navegar via router.push() em vez de <a href>,
  // então também captura o texto completo visível (sem truncar por CSS) e
  // qualquer elemento com atributo data-testid — padrão comum de seletor de
  // teste que pode revelar o nome real das rotas/seções do menu.
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
  const testIds = await page
    .$$eval('[data-testid]', (els) =>
      els.map((el) => ({
        testId: el.getAttribute('data-testid') ?? '',
        text: (el.textContent ?? '').trim().slice(0, 80),
      }))
    )
    .catch(() => []);
  // Acha uma linha de dados da tabela pelo texto (procura por algo no
  // formato de código de rastreio da Loggi, "LG" + números) e devolve o
  // HTML do menor container "tipo linha" (role=row, tr, ou um <div> comum a
  // vários textos da mesma linha) — muito mais direto que vasculhar HTML
  // cru pra achar os seletores certos de tracking/status.
  const rowHtmlSample = await page
    .evaluate(() => {
      const all = Array.from(document.querySelectorAll('body *'));
      const trackingEl = all.find((el) => /^LG\d{10,}$/.test((el.textContent ?? '').trim()));
      if (!trackingEl) return '';
      let node: Element | null = trackingEl;
      for (let i = 0; i < 8 && node; i++) {
        const role = node.getAttribute?.('role');
        if (node.tagName === 'TR' || role === 'row') return node.outerHTML.slice(0, 6000);
        node = node.parentElement;
      }
      return trackingEl.parentElement?.outerHTML.slice(0, 6000) ?? '';
    })
    .catch(() => '');
  return {
    url: page.url(),
    screenshotBase64,
    htmlSnippet: html.slice(0, 20000),
    links,
    bodyText: bodyText.slice(0, 4000),
    testIds,
    rowHtmlSample,
  };
}

// Lê a lista/painel de envios já logado. Se a Loggi paginar a lista, essa
// função só lê a primeira página — ajustar aqui se for preciso "carregar
// mais"/paginar quando os seletores reais forem confirmados.
export async function scrapeShipments(page: Page): Promise<LoggiShipment[]> {
  // Modal de boas-vindas ("Bem-vindo à nova Loggi") aparece por cima do menu
  // lateral (sempre, em toda sessão nova) e bloqueia o clique em "Envios
  // nacionais". É um carrossel de várias telas — "Avançar" só passa pra
  // próxima, não fecha — Esc não fecha, e nem achar o botão via DOM
  // funcionou (provavelmente é um widget de tour renderizado em iframe ou
  // shadow DOM, que document.querySelectorAll não alcança). Clicar por
  // coordenada de tela funciona em qualquer um desses casos, já que age no
  // nível do "mouse físico", não da árvore DOM — o X sempre aparece perto
  // do canto superior direito do cartão branco do modal.
  // Espera bem mais (alguns modais de onboarding só liberam o fechar depois
  // de alguns segundos, de propósito, pra forçar a leitura).
  await settle(4000);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.mouse.move(688, 112).catch(() => undefined);
  await settle(150);
  await page.mouse.down().catch(() => undefined);
  await settle(100);
  await page.mouse.up().catch(() => undefined);
  await settle(700);
  // Fallback: clica no fundo escurecido (fora do card branco) — padrão
  // "clique fora fecha" comum em modais.
  await page.mouse.click(50, 400).catch(() => undefined);
  await settle(700);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }).catch(() => null),
    clickButtonByText(page, LOGGI_SHIPMENTS_MENU_TEXT, 'navegando pro menu de envios'),
  ]);
  await settle(800);
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

// Qualquer status não reconhecido retorna null de propósito (só atualiza
// loggi_last_sync_at), pra nunca sobrescrever o status de uma entrega com
// um valor adivinhado errado.
//
// Status reais confirmados na tabela "Envios Nacionais" da conta (coluna
// Status): "Conferido", "Medido e pesado", "Coletado", "Cancelado".
// Confirmado com o usuário: "Conferido" e "Medido e pesado" contam como
// EM ROTA. "Cancelado" ainda não tem correspondente definido — fica
// deliberadamente sem mapear (só atualiza loggi_last_sync_at) até decidir
// o que deveria virar aqui.
export function mapLoggiStatus(loggiStatus: string): DeliveryStatus | null {
  const s = loggiStatus.toLowerCase();
  if (s.includes('entregue')) return 'ENTREGUE';
  if (s.includes('devolv')) return 'DEVOLVIDO';
  if (s.includes('não entregue') || s.includes('nao entregue') || s.includes('falha') || s.includes('insucesso')) return 'FALHA';
  if (s.includes('atraso') || s.includes('atrasad')) return 'EM ATRASO';
  if (
    s.includes('trânsito') ||
    s.includes('transito') ||
    s.includes('rota') ||
    s.includes('coletad') ||
    s.includes('saiu para entrega') ||
    s.includes('conferido') ||
    s.includes('medido e pesado')
  ) return 'EM ROTA';
  return null;
}

export function readAuthorized(req: IncomingMessage): boolean {
  const expected = process.env.CRON_SECRET;
  return !!expected && req.headers.authorization === `Bearer ${expected}`;
}
