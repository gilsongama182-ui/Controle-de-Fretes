import React, { useState, useMemo } from 'react';
import { Search, Download, ArrowLeft } from 'lucide-react';
import { Delivery, User } from '../types';
import { exportDeliveriesToCsv } from '../lib/exportCsv';
import { formatDateBR } from '../lib/formatDate';
import { formatNfe } from '../lib/formatNfe';
import ClienteHeader from './layout/ClienteHeader';

interface DashboardClienteProps {
  onLogout: () => void;
  user: User;
  deliveries: Delivery[];
}

export default function DashboardClienteScreen({
  onLogout,
  user,
  deliveries
}: DashboardClienteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [selectedUf, setSelectedUf] = useState<string | null>(null);

  // Filter deliveries based on search input (NF-e or Client)
  const filteredDeliveries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const list = showAll ? deliveries : deliveries.slice(0, 5);
    if (!term) return list;

    return deliveries.filter(d =>
      d.nfe.toLowerCase().includes(term) ||
      d.cliente.toLowerCase().includes(term) ||
      d.municipio.toLowerCase().includes(term) ||
      d.codigo.toLowerCase().includes(term)
    );
  }, [deliveries, searchTerm, showAll]);

  // Computed metrics for customer view
  const metrics = useMemo(() => {
    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'ENTREGUE').length;
    const enRoute = deliveries.filter(d => d.status === 'EM ROTA').length;
    const delayed = deliveries.filter(d => d.status === 'EM ATRASO' || d.status === 'FALHA').length;

    const pctDelivered = total > 0 ? ((delivered / total) * 100).toFixed(1) : '0.0';
    const pctEnRoute = total > 0 ? ((enRoute / total) * 100).toFixed(1) : '0.0';
    const pctDelayed = total > 0 ? ((delayed / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      pctDelivered: `${pctDelivered}%`,
      pctEnRoute: `${pctEnRoute}%`,
      pctDelayed: `${pctDelayed}%`
    };
  }, [deliveries]);

  // Entregas por UF (nível 1 do gráfico)
  const ufBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    deliveries.forEach((d) => {
      if (!d.uf) return;
      counts.set(d.uf, (counts.get(d.uf) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [deliveries]);

  // Top 10 cidades da UF selecionada (nível 2, drill-down)
  const cityBreakdown = useMemo(() => {
    if (!selectedUf) return [];
    const counts = new Map<string, number>();
    deliveries.forEach((d) => {
      if (d.uf !== selectedUf || !d.municipio) return;
      counts.set(d.municipio, (counts.get(d.municipio) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [deliveries, selectedUf]);

  const chartData = selectedUf ? cityBreakdown : ufBreakdown;
  const chartMax = chartData.length > 0 ? Math.max(...chartData.map((r) => r.count)) : 0;

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col">

      <ClienteHeader profile={user} onLogout={onLogout} />

      {/* Main Container */}
      <main className="flex-1 py-8 px-6 max-w-7xl mx-auto w-full">
        <div className="space-y-6">

          {/* Dashboard Title & Quick Search Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-headline text-3xl font-bold text-primary">Dashboard de Entregas</h1>
              <p className="text-sm text-secondary">Área do cliente para monitoramento autônomo de cargas.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Buscar por NF-e ou Destinatário"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-outline-variant bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-sans transition-all shadow-sm"
                />
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              </div>

              {/* Export report: exporta a busca ativa, ou todas as entregas do cliente se não houver busca */}
              <button
                onClick={() => exportDeliveriesToCsv(
                  searchTerm.trim() ? filteredDeliveries : deliveries,
                  `minhas-entregas-${new Date().toISOString().split('T')[0]}.csv`,
                  ['valorCobranca', 'valorPagamento', 'codigoRastreio']
                )}
                className="flex items-center justify-center gap-2 h-11 px-4 border border-outline text-primary font-sans text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-primary/5 transition-colors whitespace-nowrap shadow-sm w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                <span>EXPORTAR RELATÓRIO</span>
              </button>
            </div>
          </div>

          {/* Customer KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-secondary block mb-1">TOTAL DE ENTREGAS</span>
                <span className="text-3xl font-bold text-primary">{metrics.total}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-on-tertiary-container flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-secondary block mb-1">% ENTREGUE</span>
                <span className="text-3xl font-bold text-on-tertiary-container">{metrics.pctDelivered}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-primary-container flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-secondary block mb-1">% EM ROTA</span>
                <span className="text-3xl font-bold text-primary-container">{metrics.pctEnRoute}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-error flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-secondary block mb-1">ATRASOS / FALHAS</span>
                <span className="text-3xl font-bold text-error">{metrics.pctDelayed}</span>
              </div>
            </div>

          </div>

          {/* Recent Deliveries list card */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant">
              <h2 className="font-headline text-lg font-bold text-primary">Entregas Recentes</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant text-xs font-bold uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="px-6 py-4">NF-e</th>
                    <th className="px-6 py-4">DESTINATÁRIO</th>
                    <th className="px-6 py-4">CIDADE/UF</th>
                    <th className="px-6 py-4">STATUS</th>
                    <th className="px-6 py-4">PREVISÃO</th>
                    <th className="px-6 py-4">DATA DE ENTREGA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredDeliveries.length > 0 ? (
                    filteredDeliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-primary">{formatNfe(del.nfe)}</td>
                        <td className="px-6 py-4 font-bold text-sm text-on-surface">{del.nomeRazaoSocial}</td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant">{del.municipio}, {del.uf}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            del.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' :
                            del.status === 'EM ROTA' ? 'bg-blue-100 text-blue-800' :
                            del.status === 'EM ATRASO' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {del.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant font-medium">{formatDateBR(del.previsao)}</td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant font-medium">{del.dataEntrega ? formatDateBR(del.dataEntrega) : '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-sm text-secondary">
                        Nenhuma entrega encontrada para a sua busca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {deliveries.length > 5 && (
              <div className="p-4 border-t border-outline-variant text-center bg-surface-container-low">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-primary font-sans text-xs font-bold uppercase tracking-wider hover:underline"
                >
                  {showAll ? 'VER MENOS ENTREGAS' : 'VER TODAS AS ENTREGAS'}
                </button>
              </div>
            )}
          </div>

          {/* Entregas por UF, com drill-down para top 10 cidades */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div>
                <h2 className="font-headline text-lg font-bold text-primary">
                  {selectedUf ? `Top cidades em ${selectedUf}` : 'Entregas por UF'}
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  {selectedUf
                    ? 'As 10 cidades com mais entregas neste estado.'
                    : 'Clique em um estado para ver o detalhamento por cidade.'}
                </p>
              </div>
              {selectedUf && (
                <button
                  type="button"
                  onClick={() => setSelectedUf(null)}
                  className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para UF</span>
                </button>
              )}
            </div>

            {chartData.length === 0 ? (
              <p className="text-sm text-secondary text-center py-8">Sem dados suficientes para o gráfico.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-4 sm:gap-6 px-2 pt-6 min-w-max">
                  {chartData.map((row) => (
                    <div
                      key={row.label}
                      title={`${row.count} entrega(s)`}
                      onClick={!selectedUf ? () => setSelectedUf(row.label) : undefined}
                      className={`flex flex-col items-center gap-2 group w-14 ${!selectedUf ? 'cursor-pointer' : ''}`}
                    >
                      <span className="text-xs font-bold text-primary">{row.count}</span>
                      <div className="w-10 sm:w-12 h-36 bg-surface-container rounded-t-lg overflow-hidden flex items-end">
                        <span
                          className={`w-full block rounded-t-lg bg-primary transition-all ${!selectedUf ? 'group-hover:bg-primary-container' : ''}`}
                          style={{ height: chartMax > 0 ? `${(row.count / chartMax) * 100}%` : '0%' }}
                        ></span>
                      </div>
                      <span className="text-xs font-semibold text-on-surface-variant text-center truncate w-full">
                        {row.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 bg-surface-container-highest border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-on-surface-variant">
        <div>
          © 2024 WLOGIS - Suporte: suporte@wlogis.com.br
        </div>
        <div className="flex gap-4">
          <a className="hover:text-primary hover:underline" href="#privacy">Política de Privacidade</a>
          <a className="hover:text-primary hover:underline" href="#terms">Termos de Uso</a>
          <a className="hover:text-primary hover:underline" href="#faq">FAQ</a>
        </div>
      </footer>

    </div>
  );
}
