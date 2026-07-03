import React, { useState, useMemo } from 'react';
import {
  Truck, Download, FileUp, CheckCircle, AlertTriangle, Clock,
  Trash2, Edit, ChevronLeft, ChevronRight, ListCollapse, Table, Paperclip
} from 'lucide-react';
import { ActivePage, Delivery, User } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { exportDeliveriesToCsv } from '../lib/exportCsv';
import { formatDateBR } from '../lib/formatDate';
import { formatNfe } from '../lib/formatNfe';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import MobileBottomNav from './layout/MobileBottomNav';
import NovaEntregaModal from './layout/NovaEntregaModal';
import ImportModal from './layout/ImportModal';
import ComprovanteModal from './layout/ComprovanteModal';

interface GestaoEntregasProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  deliveries: Delivery[];
  onDeleteDelivery: (id: string) => Promise<void>;
  onSelectDeliveryForEdit: (delivery: Delivery) => void;
  onAddDelivery: (input: NewDeliveryInput) => Promise<void>;
  onImportDeliveries: (inputs: NewDeliveryInput[]) => Promise<void>;
  onUpdateDelivery: (id: string, patch: Partial<Delivery>) => Promise<void>;
}

export default function GestaoEntregasScreen({
  onNavigate,
  onLogout,
  user,
  deliveries,
  onDeleteDelivery,
  onSelectDeliveryForEdit,
  onAddDelivery,
  onImportDeliveries,
  onUpdateDelivery
}: GestaoEntregasProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ufFilter, setUfFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailedMode, setDetailedMode] = useState(true); // default to detailed/wide table
  const [currentPage, setCurrentPage] = useState(1);
  const [linesPerPage, setLinesPerPage] = useState(10);
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [comprovanteDeliveryId, setComprovanteDeliveryId] = useState<string | null>(null);
  // Deriva sempre da lista atual (não guarda uma cópia) para que o modal reflita
  // o comprovante recém-anexado assim que onUpdateDelivery atualiza o estado do pai.
  const comprovanteDelivery = comprovanteDeliveryId
    ? deliveries.find((d) => d.id === comprovanteDeliveryId) ?? null
    : null;

  // Computed metrics for active data (todos derivados do array real de entregas)
  const metrics = useMemo(() => {
    const total = deliveries.length;
    const deliveredCount = deliveries.filter(d => d.status === 'ENTREGUE').length;
    const delayedCount = deliveries.filter(d => d.status === 'EM ATRASO').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const dueTodayCount = deliveries.filter(d =>
      d.previsao === todayStr || d.previsao.toLowerCase().includes('hoje')
    ).length;
    const pctSuccess = total > 0 ? ((deliveredCount / total) * 100).toFixed(1) : '0.0';

    return { total, delayedCount, dueTodayCount, pctSuccess };
  }, [deliveries]);

  // Apply filters to deliveries
  const filteredDeliveries = useMemo(() => {
    let result = [...deliveries];

    // Search term
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter(d =>
        d.codigo.toLowerCase().includes(term) ||
        d.nfe.toLowerCase().includes(term) ||
        d.cliente.toLowerCase().includes(term) ||
        d.nomeRazaoSocial.toLowerCase().includes(term) ||
        d.cnpjCpf.replace(/\D/g, '').includes(term.replace(/\D/g, ''))
      );
    }

    // Status Filter
    if (statusFilter) {
      result = result.filter(d => d.status === statusFilter);
    }

    // UF Filter
    if (ufFilter) {
      result = result.filter(d => d.uf === ufFilter);
    }

    // Período (Data do Pedido)
    if (dateFrom) {
      result = result.filter(d => d.dataPedido >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(d => d.dataPedido <= dateTo);
    }

    return result;
  }, [deliveries, searchTerm, statusFilter, ufFilter, dateFrom, dateTo]);

  // Pagination logic
  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * linesPerPage;
    return filteredDeliveries.slice(startIndex, startIndex + linesPerPage);
  }, [filteredDeliveries, currentPage, linesPerPage]);

  const totalPages = Math.ceil(filteredDeliveries.length / linesPerPage);

  const handleDelete = async (id: string, nfe: string) => {
    if (!confirm(`Tem certeza que deseja remover a entrega NF-e ${nfe}?`)) return;
    try {
      await onDeleteDelivery(id);
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível remover: ${err.message}` : 'Não foi possível remover a entrega.');
    }
  };

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">

      <Sidebar
        activePage="gestao-entregas"
        onNavigate={onNavigate}
        onNovaEntrega={() => setIsNewDeliveryOpen(true)}
        onImportar={() => setIsImportOpen(true)}
        onLogout={onLogout}
        onUsuarios={user.profileType === 'master' ? () => onNavigate('usuarios') : undefined}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <OperadorTopBar profile={user} />

        {/* Main Content Area */}
        <main className="flex-1 p-6 w-full overflow-hidden">

          {/* Header Breadcrumbs Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="font-headline text-3xl font-bold text-primary mb-1">Gestão de Entregas</h1>
              <div className="flex items-center text-on-surface-variant gap-2 text-xs">
                <span>Logística</span>
                <ChevronRight className="w-4 h-4 text-outline" />
                <span className="text-primary font-bold">Gerenciamento de Entregas</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => exportDeliveriesToCsv(filteredDeliveries, `gestao-entregas-${new Date().toISOString().split('T')[0]}.csv`)}
                className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface-variant rounded-lg font-bold text-sm hover:bg-surface-container transition-all shadow-sm bg-white"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Relatório</span>
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 shadow-sm transition-all"
              >
                <FileUp className="w-4 h-4" />
                <span>Importar Planilha</span>
              </button>
            </div>
          </div>

          {/* Quick Insights Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            {/* Active Deliveries */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Entregas Ativas</span>
                <Truck className="text-primary w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-primary">{metrics.total}</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Total de registros na base
              </p>
            </div>

            {/* Success rate */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Taxa de Sucesso</span>
                <CheckCircle className="text-on-tertiary-container w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-primary">{metrics.pctSuccess}%</p>
              <div className="w-full bg-surface-container rounded-full h-1.5 mt-2">
                <div className="bg-on-tertiary-container h-1.5 rounded-full" style={{ width: `${metrics.pctSuccess}%` }}></div>
              </div>
            </div>

            {/* Delays count */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Em Atraso</span>
                <AlertTriangle className="text-error w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-primary">{metrics.delayedCount}</p>
              <p className="text-xs text-error font-semibold mt-1">
                {metrics.delayedCount > 0 ? 'Ação imediata requerida' : 'Nenhuma entrega em atraso'}
              </p>
            </div>

            {/* Today's forecast */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Previsão Hoje</span>
                <Clock className="text-secondary w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-primary">{metrics.dueTodayCount}</p>
              <p className="text-xs text-on-surface-variant mt-1">Com previsão para hoje</p>
            </div>

          </div>

          {/* Main Data Table Container */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">

            {/* Table Controls */}
            <div className="p-4 border-b border-outline-variant flex flex-wrap gap-3 items-center justify-between bg-surface-container-low/30">
              <div className="flex flex-wrap gap-2 items-center">

                {/* Search input */}
                <div className="relative w-72">
                  <input
                    type="text"
                    placeholder="Filtrar por NF, Destinatário ou CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                {/* Status Select */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="">Status: Todos</option>
                  <option value="ENTREGUE">Entregue</option>
                  <option value="EM ROTA">Em Rota</option>
                  <option value="EM ATRASO">Em Atraso</option>
                  <option value="FALHA">Falha</option>
                </select>

                {/* UF Select */}
                <select
                  value={ufFilter}
                  onChange={(e) => setUfFilter(e.target.value)}
                  className="px-3 py-2 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="">UF: Todos</option>
                  <option value="SP">São Paulo</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PR">Paraná</option>
                </select>

                {/* Filtro por período (Data do Pedido) */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant rounded-lg bg-white">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Período</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    max={dateTo || undefined}
                    className="text-xs outline-none bg-transparent"
                    aria-label="Data do pedido - de"
                  />
                  <span className="text-outline text-xs">até</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || undefined}
                    className="text-xs outline-none bg-transparent"
                    aria-label="Data do pedido - até"
                  />
                  {(dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="text-[10px] font-bold text-error hover:underline ml-1"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* View layout mode toggle */}
              <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
                <span className="hidden sm:block">Exibindo {filteredDeliveries.length} registros</span>
                <div className="flex border border-outline-variant rounded-lg overflow-hidden bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setDetailedMode(false)}
                    className={`p-1.5 rounded ${!detailedMode ? 'bg-primary text-on-primary' : 'hover:bg-surface-container'}`}
                    title="Tabela Simples"
                  >
                    <ListCollapse className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailedMode(true)}
                    className={`p-1.5 rounded ${detailedMode ? 'bg-primary text-on-primary' : 'hover:bg-surface-container'}`}
                    title="Tabela Detalhada (Scroll horizontal)"
                  >
                    <Table className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              {detailedMode ? (
                /* DENSE WIDE TABLE WITH HORIZONTAL SCROLL */
                <table className="w-full text-left border-collapse min-w-[3200px]">
                  <thead className="bg-surface-container-low border-b border-outline-variant text-xs font-bold uppercase tracking-wider text-on-surface-variant sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Remetente</th>
                      <th className="px-4 py-3">CNPJ Remetente</th>
                      <th className="px-4 py-3">Nº NF-e</th>
                      <th className="px-4 py-3">Pedido</th>
                      <th className="px-4 py-3">Data Pedido</th>
                      <th className="px-4 py-3">Data Expedição</th>
                      <th className="px-4 py-3">Previsão de Entrega</th>
                      <th className="px-4 py-3">Data de Entrega</th>
                      <th className="px-4 py-3">Destinatário</th>
                      <th className="px-4 py-3">CNPJ / CPF</th>
                      <th className="px-4 py-3">Endereço</th>
                      <th className="px-4 py-3">Nº</th>
                      <th className="px-4 py-3">Complemento</th>
                      <th className="px-4 py-3">Bairro / Distrito</th>
                      <th className="px-4 py-3">CEP</th>
                      <th className="px-4 py-3">Município</th>
                      <th className="px-4 py-3">UF</th>
                      <th className="px-4 py-3">Fone / Fax</th>
                      <th className="px-4 py-3">Status / Ocorrência</th>
                      <th className="px-4 py-3 text-right">Valor Cobrança</th>
                      <th className="px-4 py-3 text-right">Valor Pagto</th>
                      <th className="px-4 py-3 text-right sticky right-0 bg-surface-container-low shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {paginatedDeliveries.length > 0 ? (
                      paginatedDeliveries.map((del) => (
                        <tr key={del.id} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-4 py-4 text-xs font-semibold text-secondary">{del.remetente}</td>
                          <td className="px-4 py-4 font-mono text-xs">{del.remetenteCnpj}</td>
                          <td className="px-4 py-4 font-mono text-xs text-primary font-bold">{formatNfe(del.nfe)}</td>
                          <td className="px-4 py-4 text-xs">{del.pedido}</td>
                          <td className="px-4 py-4 font-mono text-xs">{formatDateBR(del.dataPedido)}</td>
                          <td className="px-4 py-4 font-mono text-xs">{formatDateBR(del.dataExpedicao)}</td>
                          <td className="px-4 py-4 font-mono text-xs">{del.previsao ? formatDateBR(del.previsao) : '—'}</td>
                          <td className="px-4 py-4 font-mono text-xs">{del.dataEntrega ? formatDateBR(del.dataEntrega) : '—'}</td>
                          <td className="px-4 py-4 text-xs text-on-surface">{del.nomeRazaoSocial}</td>
                          <td className="px-4 py-4 font-mono text-xs">{del.cnpjCpf}</td>
                          <td className="px-4 py-4 text-xs max-w-[200px] truncate">{del.enderecoCompleto}</td>
                          <td className="px-4 py-4 text-xs">{del.numero}</td>
                          <td className="px-4 py-4 text-xs">{del.complemento}</td>
                          <td className="px-4 py-4 text-xs">{del.bairroDistrito}</td>
                          <td className="px-4 py-4 font-mono text-xs">{del.cep}</td>
                          <td className="px-4 py-4 text-xs">{del.municipio}</td>
                          <td className="px-4 py-4 text-xs font-bold">{del.uf}</td>
                          <td className="px-4 py-4 font-mono text-xs">{del.foneFax}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider w-fit ${
                                del.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' :
                                del.status === 'EM ROTA' ? 'bg-blue-100 text-blue-800' :
                                del.status === 'EM ATRASO' ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {del.status}
                              </span>
                              <span className="text-[10px] text-on-surface-variant truncate max-w-[130px]" title={del.ocorrencia}>
                                {del.ocorrencia}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-xs text-primary font-bold">
                            R$ {del.valorCobranca.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-xs text-secondary font-bold">
                            R$ {del.valorPagamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {/* Sticky Action controls */}
                          <td className="px-4 py-4 text-right sticky right-0 bg-white group-hover:bg-[#f6f8fa] transition-colors shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setComprovanteDeliveryId(del.id)}
                                className={`p-1.5 rounded-lg transition-colors ${del.comprovantePath ? 'text-secondary hover:bg-secondary-container' : 'text-on-surface-variant hover:bg-secondary-container'}`}
                                title={del.comprovantePath ? 'Comprovante anexado' : 'Anexar comprovante de entrega'}
                              >
                                <Paperclip className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onSelectDeliveryForEdit(del)}
                                className="p-1.5 text-on-surface-variant hover:bg-secondary-container rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(del.id, del.nfe)}
                                className="p-1.5 text-error hover:bg-error-container rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={22} className="text-center py-8 text-sm text-secondary font-medium">
                          Nenhuma entrega corresponde aos filtros de busca aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                /* CONCISE COMPACT TABLE */
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low border-b border-outline-variant text-xs font-bold uppercase tracking-wider text-on-surface-variant sticky top-0">
                    <tr>
                      <th className="px-5 py-3">NF</th>
                      <th className="px-5 py-3">Destinatário</th>
                      <th className="px-5 py-3">UF</th>
                      <th className="px-5 py-3">Previsão</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Ocorrência</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {paginatedDeliveries.length > 0 ? (
                      paginatedDeliveries.map((del) => (
                        <tr key={del.id} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-5 py-4 font-mono text-sm text-primary font-bold">{formatNfe(del.nfe)}</td>
                          <td className="px-5 py-4 font-bold text-sm text-on-surface">{del.cliente}</td>
                          <td className="px-5 py-4 text-sm font-semibold">{del.uf}</td>
                          <td className="px-5 py-4 text-sm font-medium">{formatDateBR(del.previsao)}</td>
                          <td className="px-5 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              del.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' :
                              del.status === 'EM ROTA' ? 'bg-blue-100 text-blue-800' :
                              del.status === 'EM ATRASO' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {del.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-on-surface-variant truncate max-w-[200px]" title={del.ocorrencia}>
                            {del.ocorrencia}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setComprovanteDeliveryId(del.id)}
                                className={`p-1.5 rounded-lg transition-colors ${del.comprovantePath ? 'text-secondary hover:bg-secondary-container' : 'text-on-surface-variant hover:bg-secondary-container'}`}
                                title={del.comprovantePath ? 'Comprovante anexado' : 'Anexar comprovante de entrega'}
                              >
                                <Paperclip className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onSelectDeliveryForEdit(del)}
                                className="p-1.5 text-on-surface-variant hover:bg-secondary-container rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(del.id, del.nfe)}
                                className="p-1.5 text-error hover:bg-error-container rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-sm text-secondary font-medium">
                          Nenhuma entrega encontrada para a sua busca.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low/40">
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span>Linhas por página:</span>
                <select
                  value={linesPerPage}
                  onChange={(e) => {
                    setLinesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent border-none font-bold text-primary outline-none focus:ring-0 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-4 text-sm font-semibold">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container-low disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold transition-all ${
                        currentPage === i + 1
                          ? 'bg-primary text-on-primary'
                          : 'hover:bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  disabled={currentPage >= totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container-low disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>

      <MobileBottomNav activePage="gestao-entregas" onNavigate={onNavigate} onImportar={() => setIsImportOpen(true)} />

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

      <ComprovanteModal
        delivery={comprovanteDelivery}
        onClose={() => setComprovanteDeliveryId(null)}
        onUpdateDelivery={onUpdateDelivery}
      />

    </div>
  );
}
