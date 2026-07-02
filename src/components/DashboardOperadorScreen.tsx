import React, { useState, useMemo } from 'react';
import { Truck, FileUp, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { ActivePage, Delivery, User } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { exportDeliveriesToCsv } from '../lib/exportCsv';
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
  onAddDelivery: (input: NewDeliveryInput) => Promise<void>;
  onImportDelivery: (input: NewDeliveryInput) => Promise<void>;
  onSelectDeliveryForEdit: (delivery: Delivery) => void;
}

export default function DashboardOperadorScreen({
  onNavigate,
  onLogout,
  user,
  deliveries,
  onAddDelivery,
  onImportDelivery,
  onSelectDeliveryForEdit
}: DashboardOperadorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Computed metrics based on the shared deliveries array
  const metrics = useMemo(() => {
    const total = deliveries.length + 1274; // keep base similar to mockup
    const deliveredCount = deliveries.filter(d => d.status === 'ENTREGUE').length;
    const enRouteCount = deliveries.filter(d => d.status === 'EM ROTA').length;
    const delayedCount = deliveries.filter(d => d.status === 'EM ATRASO').length;

    // Proportions
    const pctDelivered = ((deliveredCount / deliveries.length) * 100).toFixed(1);
    const pctEnRoute = ((enRouteCount / deliveries.length) * 100).toFixed(1);
    const pctDelayed = ((delayedCount / deliveries.length) * 100).toFixed(1);

    return {
      total,
      pctDelivered: isNaN(Number(pctDelivered)) ? '85.4%' : `${pctDelivered}%`,
      pctEnRoute: isNaN(Number(pctEnRoute)) ? '12.2%' : `${pctEnRoute}%`,
      pctDelayed: isNaN(Number(pctDelayed)) ? '2.4%' : `${pctDelayed}%`,
    };
  }, [deliveries]);

  // Filter deliveries based on search
  const filteredDeliveries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return deliveries.slice(0, 5); // display top 5 on dashboard
    return deliveries.filter(d =>
      d.codigo.toLowerCase().includes(term) ||
      d.cliente.toLowerCase().includes(term) ||
      d.nfe.toLowerCase().includes(term) ||
      d.municipio.toLowerCase().includes(term)
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
                onClick={() => exportDeliveriesToCsv(deliveries, `relatorio-entregas-${new Date().toISOString().split('T')[0]}.csv`)}
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
                <div className="flex items-center gap-1 text-on-tertiary-container text-xs font-bold mt-1">
                  <span>+12% vs ontem</span>
                </div>
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
                <p className="text-xs text-secondary mt-1">Meta: 90%</p>
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
                <p className="text-xs text-secondary mt-1">156 veículos ativos</p>
              </div>
            </div>

            {/* 4. % No Prazo */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-primary flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Dentro do Prazo</span>
                <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                  <Clock className="text-primary w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-primary">94.8%</h4>
                <div className="w-full bg-surface-container rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '94.8%' }}></div>
                </div>
              </div>
            </div>

            {/* 5. % Fora do Prazo */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-error flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Fora do Prazo</span>
                <div className="w-8 h-8 rounded-lg bg-error-container/20 flex items-center justify-center">
                  <AlertTriangle className="text-error w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-error">5.2%</h4>
                <div className="flex items-center gap-1 text-error text-xs font-bold mt-1">
                  <span>-2% v.m.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Dashboard Body divided into columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left 2 columns: Recent Deliveries table */}
            <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
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
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">Nº PEDIDO</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">CLIENTE</th>
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
                        <td className="px-5 py-4 font-mono text-sm text-primary font-semibold">{del.codigo}</td>
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
                        <td className="px-5 py-4 text-sm text-on-surface-variant font-medium">{del.previsao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right column: Widgets */}
            <div className="space-y-6">

              {/* Delivery Efficiency Bar Chart */}
              <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
                <h4 className="font-headline text-lg font-bold text-primary mb-4">Eficiência de Entrega</h4>
                <div className="h-44 w-full flex items-end justify-between gap-3 px-2 pt-4">

                  {/* SEG bar */}
                  <div className="w-full bg-primary/20 rounded-t-lg relative group transition-all" style={{ height: '60%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">SEG</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">SEG</span>
                  </div>

                  {/* TER bar */}
                  <div className="w-full bg-primary/40 rounded-t-lg relative group transition-all" style={{ height: '75%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">TER</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">TER</span>
                  </div>

                  {/* QUA bar */}
                  <div className="w-full bg-primary/30 rounded-t-lg relative group transition-all" style={{ height: '65%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">QUA</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">QUA</span>
                  </div>

                  {/* QUI bar */}
                  <div className="w-full bg-primary rounded-t-lg relative group transition-all" style={{ height: '90%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">QUI</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">QUI</span>
                  </div>

                  {/* SEX bar */}
                  <div className="w-full bg-primary/50 rounded-t-lg relative group transition-all" style={{ height: '80%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">SEX</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">SEX</span>
                  </div>

                </div>

                <div className="mt-10 space-y-2 border-t border-outline-variant/30 pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-secondary">Média Semanal</span>
                    <span className="font-bold text-primary">78%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-secondary">Destaque</span>
                    <span className="font-bold text-on-tertiary-container">Quinta-feira (+15%)</span>
                  </div>
                </div>
              </div>

              {/* Map summary overlay widget */}
              <div className="relative overflow-hidden rounded-xl border border-outline-variant h-64 shadow-sm group">
                <div
                  className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDvMrRbhNEbTGMaQHtieGaWPfrhO92Mea7Xmfl96paanePzS12SLX_rWLuUrxhvUohzkzYXx0yp-kWGzONZOnrCDOq9I2YgXUr6gmJn-xD8vKdEM0RrLitBby-kpaEqNmnD2NdTv4XEjRoYRSBFpjQQEIkOO2iqilRiTaetTASTDObEpTbxruwUga8_X9ThUbIzY0Cbb-ldzNFe2xa6Me1Yo5x6IETa7EcRITyS9bNGSbgG5n4Dmx_Y-Q')" }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent z-10"></div>
                <div className="absolute bottom-0 left-0 p-6 z-20 text-white w-full">
                  <h5 className="font-headline text-lg font-bold">Cobertura Nacional</h5>
                  <p className="text-xs opacity-90 mb-3">14 Centros de Distribuição ativos</p>
                  <button
                    onClick={() => alert('Visualizador de Mapa Operacional Interativo em desenvolvimento.')}
                    className="w-full bg-white text-primary py-2 rounded-lg font-bold text-sm hover:bg-surface transition-colors"
                  >
                    Abrir Mapa Operacional
                  </button>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* Footer Area */}
        <footer className="w-full py-4 px-6 bg-surface-container-highest border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-2 mt-auto text-xs text-on-surface-variant">
          <div>
            © 2024 Hemmersbach Logistics - Suporte:{' '}
            <a className="font-bold hover:text-primary" href="mailto:suporte@hemmersbach.com">
              suporte@hemmersbach.com
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
        onImport={onImportDelivery}
      />

    </div>
  );
}
