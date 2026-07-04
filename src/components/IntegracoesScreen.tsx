import React, { useEffect, useState } from 'react';
import { Plug, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { ActivePage, User, Delivery } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { connectMelhorEnvio, getMelhorEnvioStatus, MelhorEnvioStatus } from '../lib/melhorEnvio';
import { formatDateBR } from '../lib/formatDate';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import MobileBottomNav from './layout/MobileBottomNav';
import NovaEntregaModal from './layout/NovaEntregaModal';
import ImportModal from './layout/ImportModal';

interface IntegracoesScreenProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  deliveries: Delivery[];
  onAddDelivery: (input: NewDeliveryInput) => Promise<void>;
  onImportDeliveries: (inputs: NewDeliveryInput[]) => Promise<void>;
}

export default function IntegracoesScreen({
  onNavigate,
  onLogout,
  user,
  deliveries,
  onAddDelivery,
  onImportDeliveries,
}: IntegracoesScreenProps) {
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [status, setStatus] = useState<MelhorEnvioStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [callbackNotice, setCallbackNotice] = useState<{ type: 'connected' | 'error'; message?: string } | null>(null);

  useEffect(() => {
    if (user.profileType !== 'master') return;

    const params = new URLSearchParams(window.location.search);
    const melhorEnvioParam = params.get('melhor_envio');
    if (melhorEnvioParam === 'connected' || melhorEnvioParam === 'error') {
      setCallbackNotice({ type: melhorEnvioParam, message: params.get('message') ?? undefined });
      const url = new URL(window.location.href);
      url.searchParams.delete('melhor_envio');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.toString());
    }

    getMelhorEnvioStatus()
      .then(setStatus)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Não foi possível checar o status.'))
      .finally(() => setLoading(false));
  }, [user.profileType]);

  if (user.profileType !== 'master') {
    return (
      <div className="p-8 text-center bg-surface min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-secondary font-medium">Acesso restrito a administradores.</p>
        <button onClick={() => onNavigate('dashboard-operador')} className="px-4 py-2 bg-primary text-white rounded">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">
      <Sidebar
        activePage="integracoes"
        onNavigate={onNavigate}
        onNovaEntrega={() => setIsNewDeliveryOpen(true)}
        onImportar={() => setIsImportOpen(true)}
        onLogout={onLogout}
        onUsuarios={() => onNavigate('usuarios')}
        onIntegracoes={() => onNavigate('integracoes')}
        onCubagem={() => onNavigate('cubagem')}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <OperadorTopBar profile={user} />

        <main className="flex-1 p-6 w-full max-w-2xl">
          <div className="mb-6">
            <h1 className="font-headline text-3xl font-bold text-primary mb-1 flex items-center gap-2">
              <Plug className="w-7 h-7 text-primary" />
              <span>Integrações</span>
            </h1>
            <p className="text-sm text-secondary">Conecte serviços externos usados na operação logística.</p>
          </div>

          {callbackNotice && (
            <div
              className={`mb-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${
                callbackNotice.type === 'connected'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-error-container/20 border border-error/30 text-error'
              }`}
            >
              {callbackNotice.type === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>
                {callbackNotice.type === 'connected'
                  ? 'Conta Melhor Envio conectada com sucesso!'
                  : callbackNotice.message || 'Não foi possível conectar com a Melhor Envio.'}
              </span>
            </div>
          )}

          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-bold text-on-surface">Melhor Envio</h2>
                <p className="text-xs text-on-surface-variant mt-1 max-w-md">
                  Usada pra sincronizar o status de rastreio das entregas enviadas por J&T Express e Loggi.
                  Preencha o campo "ID Melhor Envio" na edição de cada entrega e use o botão "Atualizar Rastreio".
                </p>
              </div>

              {loading ? (
                <span className="text-xs text-on-surface-variant">Carregando...</span>
              ) : loadError ? (
                <span className="text-xs text-error font-semibold">{loadError}</span>
              ) : status?.connected ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">
                  Não conectado
                </span>
              )}
            </div>

            {status?.connected && status.updatedAt && (
              <p className="text-[11px] text-on-surface-variant mt-3">
                Última atualização de token: {formatDateBR(status.updatedAt.split('T')[0])}
              </p>
            )}
            {status?.connected && (
              <p className="text-[11px] text-on-surface-variant mt-1 font-mono">
                Escopo concedido: {status.scope || '(vazio)'}
              </p>
            )}

            <button
              type="button"
              onClick={connectMelhorEnvio}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              {status?.connected ? 'Reconectar Melhor Envio' : 'Conectar Melhor Envio'}
            </button>
          </div>
        </main>
      </div>

      <MobileBottomNav activePage="integracoes" onNavigate={onNavigate} onImportar={() => setIsImportOpen(true)} />

      <NovaEntregaModal open={isNewDeliveryOpen} onClose={() => setIsNewDeliveryOpen(false)} onCreate={onAddDelivery} />
      <ImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={onImportDeliveries}
        existingDeliveries={deliveries}
      />
    </div>
  );
}
