import { useState, useMemo } from 'react';
import { Truck, FileUp, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { ActivePage, Delivery, User } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { exportDeliveriesToCsv } from '../lib/exportCsv';
import { formatDateBR } from '../lib/formatDate';
import { formatNfe } from '../lib/formatNfe';
import { isAtrasadoEfetivo, isEntregueNoPrazo, isEntregueForaDoPrazo } from '../lib/deliveryStatus';
import { Volume } from '../lib/deliveryVolumes';
import { DeliveryComprovante } from '../lib/comprovantes';
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
  comprovantesByDeliveryId: Map<string, DeliveryComprovante[]>;
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
  comprovantesByDeliveryId,
  onAddDelivery,
  onImportDeliveries,
  onSelectDeliveryForEdit
}: DashboardOperadorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  // Filtro disparado pelos cards de KPI — clicar num card filtra a lista de
  // entregas recentes pelo critério correspondente; clicar de novo limpa.
  const [cardFilter, setCardFilter] = useState<'entregue' | 'em-rota' | 'dentro-prazo' | 'fora-prazo' | null>(null);
  const toggleCardFilter = (key: 'entregue' | 'em-rota' | 'dentro-prazo' | 'fora-prazo') => {
    setCardFilter((prev) => (prev === key ? null : key));
  };

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

  // Filter deliveries based on search and on the active KPI card filter
  const filteredDeliveries = useMemo(() => {
    let result = deliveries;

    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const termDigits = term.replace(/\D/g, '');
      result = result.filter(d =>
        d.codigo.toLowerCase().includes(term) ||
        d.cliente.toLowerCase().includes(term) ||
        d.nfe.toLowerCase().includes(term) ||
        d.municipio.toLowerCase().includes(term) ||
        // Chave de acesso da NF-e não aparece em tela — leitor de código de
        // barras na nota impressa preenche o campo de busca sem precisar digitar.
        (termDigits.length > 0 && d.chaveAcessoNfe.includes(termDigits))
      );
    }

    if (cardFilter === 'entregue') {
      result = result.filter(d => d.status === 'ENTREGUE');
    } else if (cardFilter === 'em-rota') {
      result = result.filter(d => d.status === 'EM ROTA');
    } else if (cardFilter === 'dentro-prazo') {
      result = result.filter(d => !isAtrasadoEfetivo(d) && d.status !== 'FALHA' && !isEntregueForaDoPrazo(d));
    } else if (cardFilter === 'fora-prazo') {
      result = result.filter(d => isAtrasadoEfetivo(d) || d.status === 'FALHA' || isEntregueForaDoPrazo(d));
    }

    // Sem busca nem filtro de card, mostra só as 5 mais recentes (visão de painel)
    return !term && !cardFilter ? result.slice(0, 5) : result;
  }, [deliveries, searchTerm, cardFilter]);

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
                onClick={() => exportDeliveriesToCsv(deliveries, `relatorio-entregas-${new Date().toISOString().split('T')[0]}.csv`, [], volumesByDeliveryId, comprovantesByDeliveryId)}
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

            {/* 1. Total Entregas — clicar limpa o filtro por card */}
            <button
              type="button"
              onClick={() => setCardFilter(null)}
              title="Mostrar todas as entregas"
              className={`text-left bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-all ${
                cardFilter === null ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant hover:border-primary/50'
              }`}
            >
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
            </button>

            {/* 2. % Entregue — filtra status ENTREGUE */}
            <button
              type="button"
              onClick={() => toggleCardFilter('entregue')}
              title="Filtrar entregas com status Entregue"
              className={`text-left bg-white p-5 rounded-xl border shadow-sm border-l-4 border-l-on-tertiary-container flex flex-col justify-between transition-all ${
                cardFilter === 'entregue' ? 'border-on-tertiary-container ring-2 ring-on-tertiary-container/30' : 'border-outline-variant hover:border-on-tertiary-container/50'
              }`}
            >
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
            </button>

            {/* 3. % Em Rota — filtra status EM ROTA */}
            <button
              type="button"
              onClick={() => toggleCardFilter('em-rota')}
              title="Filtrar entregas com status Em Rota"
              className={`text-left bg-white p-5 rounded-xl border shadow-sm border-l-4 border-l-secondary flex flex-col justify-between transition-all ${
                cardFilter === 'em-rota' ? 'border-secondary ring-2 ring-secondary/30' : 'border-outline-variant hover:border-secondary/50'
              }`}
            >
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
            </button>

            {/* 4. % No Prazo (proxy: fora de EM ATRASO / FALHA) */}
            <button
              type="button"
              onClick={() => toggleCardFilter('dentro-prazo')}
              title="Filtrar entregas dentro do prazo"
              className={`text-left bg-white p-5 rounded-xl border shadow-sm border-l-4 border-l-primary flex flex-col justify-between transition-all ${
                cardFilter === 'dentro-prazo' ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant hover:border-primary/50'
              }`}
            >
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
            </button>

            {/* 5. % Fora do Prazo (EM ATRASO + FALHA) */}
            <button
              type="button"
              onClick={() => toggleCardFilter('fora-prazo')}
              title="Filtrar entregas fora do prazo"
              className={`text-left bg-white p-5 rounded-xl border shadow-sm border-l-4 border-l-error flex flex-col justify-between transition-all ${
                cardFilter === 'fora-prazo' ? 'border-error ring-2 ring-error/30' : 'border-outline-variant hover:border-error/50'
              }`}
            >
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
            </button>

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
                            del.status === 'DEVOLVIDO' ? 'bg-gray-200 text-gray-800' :
                            del.status === 'AGUARDANDO EXPEDIÇÃO' ? 'bg-purple-100 text-purple-800' :
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
