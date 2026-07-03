import type { IncomingMessage, ServerResponse } from 'http';
import { randomBytes } from 'crypto';
import { ME_CLIENT_ID, ME_BASE_URL, ME_REDIRECT_URI, sendJson } from './_shared.js';

// GET puro (o navegador navega pra cá de verdade, pra depois ir pra tela de
// login/aprovação da Melhor Envio) — por isso não dá pra exigir o header
// Authorization aqui (uma navegação normal não permite header customizado).
// Sem problema: este endpoint só redireciona; ele não lê nem grava nada
// sensível. A tela "Conectar Melhor Envio" já só aparece pra usuários
// master (checagem client-side, igual à tela de Usuários).
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  if (!ME_CLIENT_ID || !ME_REDIRECT_URI) {
    sendJson(res, 500, { error: 'MELHOR_ENVIO_CLIENT_ID ou MELHOR_ENVIO_REDIRECT_URI não configurados.' });
    return;
  }

  // Proteção CSRF do fluxo OAuth: guarda um valor aleatório num cookie
  // httpOnly de curta duração e confere que bate com o "state" que volta
  // no callback.
  const state = randomBytes(16).toString('hex');
  res.setHeader(
    'Set-Cookie',
    `me_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const authorizeUrl = new URL('/oauth/authorize', ME_BASE_URL);
  authorizeUrl.searchParams.set('client_id', ME_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', ME_REDIRECT_URI);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);
  // "shipping-tracking" é o escopo que a API de rastreio exige (confirmado
  // por tentativa/erro: sem escopo explícito o token vinha sem nenhuma
  // permissão, e a chamada de rastreio retornava 403 "unauthorized").
  authorizeUrl.searchParams.set('scope', 'shipping-tracking');

  res.statusCode = 302;
  res.setHeader('Location', authorizeUrl.toString());
  res.end();
}
