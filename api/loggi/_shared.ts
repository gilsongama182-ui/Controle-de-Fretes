import type { IncomingMessage, ServerResponse } from 'http';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer-core';
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
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY as string;
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
// data-testid por linha): cada linha é um <tr> dentro do <tbody>, com as
// colunas na ordem "Destinatário, Criação, Prazo, Cód. Rastreio, Status" —
// ou seja, a 3ª coluna é a data de CRIAÇÃO do envio (não usada), a 4ª é o
// PRAZO real de entrega, a 5ª é o código de rastreio, a 6ª é o status.
// Continuam configuráveis por env var pro caso da Loggi mudar o layout de
// novo sem precisar de deploy pra corrigir.
const LOGGI_ROW_SELECTOR = process.env.LOGGI_ROW_SELECTOR || 'tbody tr.MuiTableRow-root';
const LOGGI_PRAZO_SELECTOR = process.env.LOGGI_PRAZO_SELECTOR || 'td:nth-child(4)';
const LOGGI_TRACKING_SELECTOR = process.env.LOGGI_TRACKING_SELECTOR || 'td:nth-child(5)';
const LOGGI_STATUS_SELECTOR = process.env.LOGGI_STATUS_SELECTOR || 'td:nth-child(6)';

// Botão "⋮" (mais opções) de cada linha, que abre o menu com "Compartilhar"/
// "Ver detalhes" — confirmado visualmente (print do usuário) como o único
// botão da linha, na última célula. Ainda não confirmado via inspeção real
// do HTML (só o print) — mesmo aviso de fragilidade dos outros seletores.
const LOGGI_ROW_MENU_BUTTON_SELECTOR = process.env.LOGGI_ROW_MENU_BUTTON_SELECTOR || 'button';
const LOGGI_VER_DETALHES_TEXT = process.env.LOGGI_VER_DETALHES_TEXT || 'Ver detalhes';
// Trecho fixo que antecede a data real de entrega no painel de detalhes
// ("O pacote foi entregue em 17 jul, 2026") — usado tanto pra confirmar que
// o painel carregou quanto pra achar a frase certa em meio ao resto do texto.
const LOGGI_ENTREGUE_EM_TEXTO = process.env.LOGGI_ENTREGUE_EM_TEXTO || 'entregue em';

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

// Cliente autenticado com o token de sessão de quem chamou a função —
// respeita a RLS normal de "deliveries", usado pelo sync manual (sync.ts,
// disparado pelo botão na tela). Diferente do cron automático, que usa
// service_role porque roda sem sessão de usuário nenhuma.
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

export interface DeliveryTrackingRow {
  id: string;
  codigo_rastreio: string | null;
  melhor_envio_id: string | null;
  previsao: string | null;
}

export interface LoggiShipment {
  trackingCode: string;
  rawStatus: string;
  rawPrazo: string;
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
export async function captureDebug(page: Page, trackingCodeHint?: string): Promise<DebugCapture> {
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
  // Se um código de rastreio específico for passado, acha a linha exata
  // dele (mais confiável pra depurar um caso reportado); senão cai pro
  // padrão genérico "LG" + números, pegando a primeira linha que achar.
  const rowHtmlSample = await page
    .evaluate((hint) => {
      const all = Array.from(document.querySelectorAll('body *'));
      const trackingEl = hint
        ? all.find((el) => (el.textContent ?? '').trim() === hint)
        : all.find((el) => /^LG\d{10,}$/.test((el.textContent ?? '').trim()));
      if (!trackingEl) return '';
      let node: Element | null = trackingEl;
      for (let i = 0; i < 8 && node; i++) {
        const role = node.getAttribute?.('role');
        if (node.tagName === 'TR' || role === 'row') return node.outerHTML.slice(0, 6000);
        node = node.parentElement;
      }
      return trackingEl.parentElement?.outerHTML.slice(0, 6000) ?? '';
    }, trackingCodeHint ?? '')
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
  // waitForSelector só garante que o elemento existe, não que o conteúdo já
  // carregou — a tabela passa por um estado de "carregando" (skeleton) que
  // usa as mesmas classes CSS das linhas reais, então ler rápido demais pega
  // células vazias. Espera até pelo menos uma linha ter um código de
  // rastreio de verdade (padrão "LG" + números) antes de raspar tudo.
  await page
    .waitForFunction(
      (rowSel, trackingSel) => {
        const rows = document.querySelectorAll(rowSel);
        for (const row of Array.from(rows)) {
          const el = row.querySelector(trackingSel);
          if (el && /^LG\d+/.test((el.textContent ?? '').trim())) return true;
        }
        return false;
      },
      { timeout: NAV_TIMEOUT_MS },
      LOGGI_ROW_SELECTOR,
      LOGGI_TRACKING_SELECTOR
    )
    .catch(() => undefined);

  return page.$$eval(
    LOGGI_ROW_SELECTOR,
    (rows, trackingSelector, statusSelector, prazoSelector) =>
      rows
        .map((row) => {
          const trackingEl = row.querySelector(trackingSelector);
          const statusEl = row.querySelector(statusSelector);
          const prazoEl = row.querySelector(prazoSelector);
          const trackingCode = trackingEl?.textContent?.trim() ?? '';
          const rawStatus = statusEl?.textContent?.trim() ?? '';
          const rawPrazo = prazoEl?.textContent?.trim() ?? '';
          return { trackingCode, rawStatus, rawPrazo };
        })
        .filter((s) => s.trackingCode && s.rawStatus),
    LOGGI_TRACKING_SELECTOR,
    LOGGI_STATUS_SELECTOR,
    LOGGI_PRAZO_SELECTOR
  );
}

// Abre o painel de detalhes de um envio (clique no "⋮" da linha -> "Ver
// detalhes") pra ler a data REAL de entrega ("O pacote foi entregue em 17
// jul, 2026") em vez de carimbar a data/hora em que o sync rodou. Só deve
// ser chamada pras entregas que estão virando ENTREGUE nessa execução (ver
// limite no chamador) — abrir o painel de cada envio é bem mais lento que
// ler a tabela inteira de uma vez só, e a function tem só 60s no total.
// Nunca lança: qualquer falha aqui cai no fallback de usar a data/hora do
// sync (melhor um valor aproximado do que travar a execução inteira).
export async function buscarDataEntregaReal(page: Page, trackingCode: string): Promise<string | null> {
  try {
    const rows = await page.$$(LOGGI_ROW_SELECTOR);
    let linhaAlvo: ElementHandle<Element> | null = null;
    for (const row of rows) {
      const texto = await row.$eval(LOGGI_TRACKING_SELECTOR, (el) => el.textContent?.trim() ?? '').catch(() => '');
      if (texto === trackingCode) {
        linhaAlvo = row;
        break;
      }
    }
    if (!linhaAlvo) return null;

    const botaoMenu = await linhaAlvo.$(LOGGI_ROW_MENU_BUTTON_SELECTOR);
    if (!botaoMenu) return null;
    await botaoMenu.click();
    await settle(400);
    await clickButtonByText(page, LOGGI_VER_DETALHES_TEXT, `abrindo detalhes de ${trackingCode}`);
    await settle(600);

    await page.waitForFunction(
      (trecho) => document.body.innerText.toLowerCase().includes(trecho),
      { timeout: NAV_TIMEOUT_MS },
      LOGGI_ENTREGUE_EM_TEXTO,
    );

    const bodyText = await page.evaluate(() => document.body.innerText);
    const idx = bodyText.toLowerCase().indexOf(LOGGI_ENTREGUE_EM_TEXTO);
    const dataReal = idx >= 0
      ? parseDataAbreviadaPt(bodyText.slice(idx, idx + LOGGI_ENTREGUE_EM_TEXTO.length + 20), false)
      : null;

    await page.keyboard.press('Escape').catch(() => undefined);
    await settle(400);
    return dataReal;
  } catch {
    await page.keyboard.press('Escape').catch(() => undefined);
    return null;
  }
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
    // Fallback: a Loggi não expõe data real de entrega na lista, só no
    // painel de detalhes de cada envio (via buscarDataEntregaReal, chamada
    // pelo caller em sync.ts/cron-sync.ts). Isso aqui é só o valor usado
    // quando essa busca falha ou estoura o limite por execução.
    if (mappedStatus === 'ENTREGUE') patch.data_entrega = nowIso.split('T')[0];
  }

  // Só preenche a previsão se ainda não tiver nenhuma — a pedido do
  // usuário, a primeira previsão definida não pode ser trocada por
  // atualizações posteriores da Loggi (mesmo padrão já usado pra
  // codigo_rastreio na integração com a Melhor Envio: nunca sobrescreve
  // algo que já foi preenchido).
  if (!delivery.previsao) {
    const previsao = parsePrazoLoggi(shipment.rawPrazo);
    if (previsao) patch.previsao = previsao;
  }

  return { ok: true, rawStatus: shipment.rawStatus, mappedStatus, patch };
}

const MESES_PT: Record<string, string> = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};

// Converte "21 jul, 2026" (ou variações sem vírgula/ponto) pro formato ISO.
// Usada tanto pro texto isolado da coluna "Prazo" (âncora no início/fim da
// string) quanto pra achar a data embutida no meio de uma frase, como
// "O pacote foi entregue em 17 jul, 2026" do painel de detalhes.
function parseDataAbreviadaPt(texto: string, ancorada: boolean): string | null {
  const padrao = /(\d{1,2})\s+([a-zçã]{3,4})\.?,?\s+(\d{4})/i;
  const match = (ancorada ? new RegExp(`^${padrao.source}$`, 'i') : padrao).exec(texto.trim());
  if (!match) return null;
  const [, day, monthAbbr, year] = match;
  const month = MESES_PT[monthAbbr.toLowerCase().slice(0, 3)];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

// A coluna "Prazo" da Loggi mostra datas como "21 jul, 2026", ou texto como
// "A definir" quando não há prazo (ex: envio cancelado) — nesse caso retorna
// null e a previsão simplesmente não é tocada.
export function parsePrazoLoggi(rawPrazo: string): string | null {
  return parseDataAbreviadaPt(rawPrazo, true);
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
