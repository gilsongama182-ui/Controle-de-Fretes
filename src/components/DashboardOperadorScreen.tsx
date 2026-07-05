import { useState, useMemo } from 'react';
import { Truck, FileUp, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { ActivePage, Delivery, User } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { exportDeliveriesToCsv } from '../lib/exportCsv';
import { formatDateBR } from '../lib/formatDate';
import { formatNfe } from '../lib/formatNfe';
import { isAtrasadoEfetivo, isEntregueNoPrazo, isEntregueForaDoPrazo } from '../lib/deliveryStatus';
import { Volume } from '../lib/deliveryVolumes';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import MobileBottomNav from './layout/MobileBottomNav';
import NovaEntregaModal from './layout/NovaEntregaModal';
import ImportModal from './layout/ImportModal';

interface DashboardOperadorProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  deliveries: Delivery[];
  volumesByDeliveryId: Map<string, Volume[]>;
  onAddDelivery: (input: NewDeliveryInput) => Promise<void>;
  onImportDeliveries: (inputs: NewDeliveryInput[]) => Promise<void>;
  onSelectDeliveryForEdit: (delivery: Delivery) => void;
}

export default function DashboardOperadorScreen({
  onNavigate,
  onLogout,
  user,
  deliveries,
  volumesByDeliveryId,
  onAddDelivery,
  onImportDeliveries,
  onSelectDeliveryForEdit
}: DashboardOperadorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Computed metrics based on the shared deliveries array
  const metrics = useMemo(() => {
    const total = deliveries.length;
    const deliveredCount = deliveries.filter(d => d.status === 'ENTREGUE').length;
    const enRouteCount = deliveries.filter(d => d.status === 'EM ROTA').length;
    const failedCount = deliveries.filter(d => d.status === 'FALHA').length;
    // "Fora do prazo" junta quem ainda está em rota com previsão vencida e
    // quem já foi entregue mas depois do prazo — não depende de ninguém
    // marcar EM ATRASO manualmente.
    const atrasadoCount = deliveries.filter(isAtrasadoEfetivo).length;
    const entregueForaDoPrazoCount = deliveries.filter(isEntregueForaDoPrazo).length;
    const entregueNoPrazoCount = deliveries.filter(isEntregueNoPrazo).length;
    const offTrackCount = atrasadoCount + failedCount + entregueForaDoPrazoCount;

    // Proporções reais sobre o total de entregas (0 quando não há dados)
    const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0');
    const pctOnTrack = total > 0 ? (((total - offTrackCount) / total) * 100).toFixed(1) : '0.0';
    const pctOffTrack = total > 0 ? ((offTrackCount / total) * 100).toFixed(1) : '0.0';

    // % Entregue mede a performance real de prazo: das entregas já
    // CONCLUÍDAS (entregue ou falha, não sobre o total — senão o indicador
    // fica artificialmente baixo enquanto houver entrega ainda em rota),
    // quantas foram feitas dentro do prazo. Uma entrega feita fora do prazo
    // conta como sucesso (foi entregue), mas não como performance.
    const finalizedCount = deliveredCount + failedCount;
    const pctDelivered = finalizedCount > 0 ? ((entregueNoPrazoCount / finalizedCount) * 100).toFixed(1) : '0.0';

    return {
      total,
      enRouteCount,
      entregueNoPrazoCount,
      entregueForaDoPrazoCount,
      pctDelivered: `${pctDelivered}%`,
      pctEnRoute: `${pct(enRouteCount)}%`,
      pctOnTrack: `${pctOnTrack}%`,
      pctOffTrack: `${pctOffTrack}%`,
    };
  }, [deliveries]);

  // Filter deliveries based on search
  const filteredDeliveries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return deliveries.slice(0, 5); // display top 5 on dashboard
    const termDigits = term.replace(/\D/g, '');
    return deliveries.filter(d =>
      d.codigo.toLowerCase().includes(term) ||
      d.cliente.toLowerCase().includes(term) ||
      d.nfe.toLowerCase().includes(term) ||
      d.municipio.toLowerCase().includes(term) ||
      // Chave de acesso da NF-e não aparece em tela — leitor de código de
      // barras na nota impressa preenche o campo de busca sem precisar digitar.
      (termDigits.length > 0 && d.chaveAcessoNfe.includes(termDigits))
    );
  }, [deliveries, searchTerm]);

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">

      <Sidebar
        activePage="dashboard-operador"
        onNavigate={onNavigate}
        onNovaEntrega={() => setIsNewDeliveryOpen(true)}
        onImportar={() => setIsImportOpen(true)}
        onLogout={onLogout}
        onUsuarios={user.profileType === 'master' ? () => onNavigate('usuarios') : undefined}
        onIntegracoes={user.profileType === 'master' ? () => onNavigate('integracoes') : undefined}
        onCubagem={user.profileType === 'master' ? () => onNavigate('cubagem') : undefined}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        <OperadorTopBar profile={user} searchValue={searchTerm} onSearchChange={setSearchTerm} />

        {/* Page Content */}
        <main className="p-6 space-y-6 flex-1">

          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="font-headline text-2xl font-bold text-primary">Painel de Controle Geral</h3>
              <p className="text-sm text-secondary">Monitoramento em tempo real das operações de transporte.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => exportDeliveriesToCsv(deliveries, `relatorio-entregas-${new Date().toISOString().split('T')[0]}.csv`, [], volumesByDeliveryId)}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-bold text-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Relatório</span>
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:brightness-110 transition-all font-bold text-sm shadow-md"
              >
                <FileUp className="w-4 h-4" />
                <span>Importar Planilha</span>
              </button>
            </div>
          </div>

          {/* KPI Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            {/* 1. Total Entregas */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Total de Entregas</span>
                <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                  <Truck className="text-primary w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-primary">{metrics.total}</h4>
                <p className="text-xs text-secondary mt-1">Total de registros na base</p>
              </div>
            </div>

            {/* 2. % Entregue */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-on-tertiary-container flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">% Entregue</span>
                <div className="w-8 h-8 rounded-lg bg-tertiary-container/10 flex items-center justify-center">
                  <CheckCircle className="text-on-tertiary-container w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-primary">{metrics.pctDelivered}</h4>
                <p className="text-xs text-secondary mt-1">Meta: 98,5%</p>
                <p className="text-xs text-secondary">
                  {metrics.entregueNoPrazoCount} no prazo · {metrics.entregueForaDoPrazoCount} fora do prazo
                </p>
              </div>
            </div>

            {/* 3. % Em Rota */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-secondary flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">% Em Rota</span>
                <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center">
                  <Truck className="text-on-secondary-container w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-primary">{metrics.pctEnRoute}</h4>
                <p className="text-xs text-secondary mt-1">{metrics.enRouteCount} entrega(s) em rota</p>
              </div>
            </div>

            {/* 4. % No Prazo (proxy: fora de EM ATRASO / FALHA) */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-primary flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Dentro do Prazo</span>
                <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                  <Clock className="text-primary w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-primary">{metrics.pctOnTrack}</h4>
                <div className="w-full bg-surface-container rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: metrics.pctOnTrack }}></div>
                </div>
              </div>
            </div>

            {/* 5. % Fora do Prazo (EM ATRASO + FALHA) */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-error flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Fora do Prazo</span>
                <div className="w-8 h-8 rounded-lg bg-error-container/20 flex items-center justify-center">
                  <AlertTriangle className="text-error w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-error">{metrics.pctOffTrack}</h4>
                <p className="text-xs text-secondary mt-1">Em atraso ou com falha</p>
              </div>
            </div>

          </div>

          {/* Recent Deliveries table */}
          <div>
            <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-5 flex justify-between items-center border-b border-outline-variant">
                <h4 className="font-headline text-lg font-bold text-primary">Entregas Recentes</h4>
                <button
                  onClick={() => onNavigate('gestao-entregas')}
                  className="text-primary font-bold text-sm hover:underline"
                >
                  Ver tudo
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container border-b border-outline-variant">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">NF-E</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">DESTINATÁRIO</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">CIDADE/UF</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">STATUS</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">PREVISÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredDeliveries.map((del) => (
                      <tr
                        key={del.id}
                        onClick={() => onSelectDeliveryForEdit(del)}
                        className="hover:bg-primary/5 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-4 font-mono text-sm text-primary font-semibold">{formatNfe(del.nfe)}</td>
                        <td className="px-5 py-4 font-semibold text-sm text-on-surface">{del.cliente}</td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant">{del.municipio}, {del.uf}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            del.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' :
                            del.status === 'EM ROTA' ? 'bg-blue-100 text-blue-800' :
                            del.status === 'EM ATRASO' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {del.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant font-medium">{formatDateBR(del.previsao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        {/* Footer Area */}
        <footer className="w-full py-4 px-6 bg-surface-container-highest border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-2 mt-auto text-xs text-on-surface-variant">
          <div>
            © 2024 WLOGIS - Suporte:{' '}
            <a className="font-bold hover:text-primary" href="mailto:suporte@wlogis.com.br">
              suporte@wlogis.com.br
            </a>
          </div>
          <div className="flex gap-4">
            <a className="hover:text-primary hover:underline" href="#privacy">Política de Privacidade</a>
            <a className="hover:text-primary hover:underline" href="#terms">Termos de Uso</a>
            <a className="hover:text-primary hover:underline" href="#faq">FAQ</a>
          </div>
        </footer>

      </div>

      <MobileBottomNav activePage="dashboard-operador" onNavigate={onNavigate} onImportar={() => setIsImportOpen(true)} />

      <NovaEntregaModal
        open={isNewDeliveryOpen}
        onClose={() => setIsNewDeliveryOpen(false)}
        onCreate={onAddDelivery}
      />

      <ImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={onImportDeliveries}
        existingDeliveries={deliveries}
      />

    </div>
  );
}
