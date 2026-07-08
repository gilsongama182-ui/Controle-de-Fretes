import { useState, useMemo, useEffect } from 'react';
import {
  Truck, Download, FileUp, CheckCircle, AlertTriangle, Clock,
  Trash2, Edit, ChevronLeft, ChevronRight, ListCollapse, Table, Paperclip, Tag, RefreshCw,
  ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';
import { ActivePage, Delivery, User } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { exportDeliveriesToCsv } from '../lib/exportCsv';
import { formatDateBR } from '../lib/formatDate';
import { formatNfe } from '../lib/formatNfe';
import { isAtrasadoEfetivo, isEntregueNoPrazo, isEntregueForaDoPrazo } from '../lib/deliveryStatus';
import { fetchMotoristas, ProfileRecord } from '../lib/profiles';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import MobileBottomNav from './layout/MobileBottomNav';
import NovaEntregaModal from './layout/NovaEntregaModal';
import ImportModal from './layout/ImportModal';
import ComprovanteModal from './layout/ComprovanteModal';
import EtiquetaPrintView from './layout/EtiquetaPrintView';
import { SyncItemResult } from '../lib/melhorEnvio';
import { Volume } from '../lib/deliveryVolumes';

interface GestaoEntregasProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  deliveries: Delivery[];
  volumesByDeliveryId: Map<string, Volume[]>;
  onDeleteDelivery: (id: string) => Promise<void>;
  onSelectDeliveryForEdit: (delivery: Delivery) => void;
  onAddDelivery: (input: NewDeliveryInput) => Promise<void>;
  onImportDeliveries: (inputs: NewDeliveryInput[]) => Promise<void>;
  onUpdateDelivery: (id: string, patch: Partial<Delivery>) => Promise<void>;
  onSyncTracking: (ids: string[]) => Promise<SyncItemResult[]>;
  onAssignMotorista: (ids: string[], motoristaId: string | null, motoristaNome: string) => Promise<void>;
}

export default function GestaoEntregasScreen({
  onNavigate,
  onLogout,
  user,
  deliveries,
  volumesByDeliveryId,
  onDeleteDelivery,
  onSelectDeliveryForEdit,
  onAddDelivery,
  onImportDeliveries,
  onUpdateDelivery,
  onSyncTracking,
  onAssignMotorista
}: GestaoEntregasProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ufFilter, setUfFilter] = useState('');
  const [comprovanteFilter, setComprovanteFilter] = useState<'' | 'com' | 'sem'>('');
  const [motoristaFilter, setMotoristaFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [motoristas, setMotoristas] = useState<ProfileRecord[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [sortKey, setSortKey] = useState<keyof Delivery | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [detailedMode, setDetailedMode] = useState(true); // default to detailed/wide table
  const [currentPage, setCurrentPage] = useState(1);
  const [linesPerPage, setLinesPerPage] = useState(10);
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [comprovanteDeliveryId, setComprovanteDeliveryId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEtiquetaOpen, setIsEtiquetaOpen] = useState(false);
  const [isSyncingTracking, setIsSyncingTracking] = useState(false);
  // Deriva sempre da lista atual (não guarda uma cópia) para que o modal reflita
  // o comprovante recém-anexado assim que onUpdateDelivery atualiza o estado do pai.
  const comprovanteDelivery = comprovanteDeliveryId
    ? deliveries.find((d) => d.id === comprovanteDeliveryId) ?? null
    : null;

  useEffect(() => {
    fetchMotoristas()
      .then(setMotoristas)
      .catch((err) => console.error('Falha ao buscar motoristas:', err));
  }, []);

  // Computed metrics for active data (todos derivados do array real de entregas)
  const metrics = useMemo(() => {
    const total = deliveries.length;
    const deliveredCount = deliveries.filter(d => d.status === 'ENTREGUE').length;
    const failedCount = deliveries.filter(d => d.status === 'FALHA').length;
    // "Em atraso" mede quem ainda está em rota e já passou da previsão —
    // não depende de alguém marcar EM ATRASO manualmente.
    const delayedCount = deliveries.filter(isAtrasadoEfetivo).length;
    const todayStr = new Date().toISOString().split('T')[0];
    // Só conta quem ainda está pendente (EM ROTA/EM ATRASO) — uma entrega já
    // finalizada (ENTREGUE/FALHA/DEVOLVIDO) sem dataEntrega preenchida (ex:
    // importação antiga sem essa coluna) não deve aparecer como "prevista
    // para hoje", senão o card diverge da lista de pendentes.
    const dueTodayCount = deliveries.filter(d =>
      (d.status === 'EM ROTA' || d.status === 'EM ATRASO')
      && (d.previsao === todayStr || d.previsao.toLowerCase().includes('hoje'))
    ).length;
    // Mesma lógica do Painel de Controle: mede a performance real de prazo
    // sobre as entregas já concluídas (entregue ou falha), não sobre o total
    // geral — senão o indicador fica artificialmente baixo enquanto houver
    // muita entrega ainda em rota, que nem teve chance de ser entregue ainda.
    // Entregue fora do prazo conta como sucesso, mas não como performance.
    const finalizedCount = deliveredCount + failedCount;
    const noPrazoCount = deliveries.filter(isEntregueNoPrazo).length;
    const foraDoPrazoCount = deliveries.filter(isEntregueForaDoPrazo).length;
    const pctSuccess = finalizedCount > 0 ? ((noPrazoCount / finalizedCount) * 100).toFixed(1) : '0.0';

    return { total, delayedCount, dueTodayCount, pctSuccess, noPrazoCount, foraDoPrazoCount };
  }, [deliveries]);

  // Apply filters to deliveries
  const filteredDeliveries = useMemo(() => {
    let result = [...deliveries];

    // Search term
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      // Só compara dígitos do CNPJ/CPF quando o termo tem algum dígito —
      // "".includes("") é sempre true em JS, então sem essa checagem uma
      // busca só com letras (ex: "brito") "vazava" e batia com tudo.
      const termDigits = term.replace(/\D/g, '');
      result = result.filter(d =>
        d.codigo.toLowerCase().includes(term) ||
        d.nfe.toLowerCase().includes(term) ||
        d.cliente.toLowerCase().includes(term) ||
        d.nomeRazaoSocial.toLowerCase().includes(term) ||
        (termDigits.length > 0 && d.cnpjCpf.replace(/\D/g, '').includes(termDigits)) ||
        // Busca também pela chave de acesso da NF-e (não aparece em tela, só
        // no banco) — permite ao time da operação usar leitor de código de
        // barras na nota impressa em vez de digitar qualquer informação.
        (termDigits.length > 0 && d.chaveAcessoNfe.includes(termDigits))
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

    // Comprovante anexado ou não
    if (comprovanteFilter === 'com') {
      result = result.filter(d => !!d.comprovantePath);
    } else if (comprovanteFilter === 'sem') {
      result = result.filter(d => !d.comprovantePath);
    }

    // Motorista atribuído
    if (motoristaFilter) {
      result = result.filter(d => d.motoristaId === motoristaFilter);
    }

    // Período (Data do Pedido)
    if (dateFrom) {
      result = result.filter(d => d.dataPedido >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(d => d.dataPedido <= dateTo);
    }

    return result;
  }, [deliveries, searchTerm, statusFilter, ufFilter, comprovanteFilter, motoristaFilter, dateFrom, dateTo]);

  // Ordenação por coluna — clicar num cabeçalho ordena por aquele campo;
  // clicar de novo no mesmo cabeçalho inverte a direção.
  const sortedDeliveries = useMemo(() => {
    if (!sortKey) return filteredDeliveries;
    const arr = [...filteredDeliveries];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR', { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filteredDeliveries, sortKey, sortDirection]);

  const handleSort = (key: keyof Delivery) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Volta pra primeira página sempre que os filtros mudam — senão a página
  // atual pode ficar além do fim da lista filtrada e a tabela parece vazia.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, ufFilter, comprovanteFilter, motoristaFilter, dateFrom, dateTo]);

  // Pagination logic
  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * linesPerPage;
    return sortedDeliveries.slice(startIndex, startIndex + linesPerPage);
  }, [sortedDeliveries, currentPage, linesPerPage]);

  const totalPages = Math.ceil(filteredDeliveries.length / linesPerPage);

  const handleDelete = async (id: string, nfe: string) => {
    if (!confirm(`Tem certeza que deseja remover a entrega NF-e ${nfe}?`)) return;
    try {
      await onDeleteDelivery(id);
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível remover: ${err.message}` : 'Não foi possível remover a entrega.');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = paginatedDeliveries.length > 0 && paginatedDeliveries.every((d) => selectedIds.has(d.id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedDeliveries.forEach((d) => next.delete(d.id));
      } else {
        paginatedDeliveries.forEach((d) => next.add(d.id));
      }
      return next;
    });
  };

  const selectedDeliveries = deliveries.filter((d) => selectedIds.has(d.id));

  const handleAssignMotorista = async (value: string) => {
    if (!value) return;
    setIsAssigning(true);
    try {
      const ids = Array.from(selectedIds);
      if (value === '__clear__') {
        await onAssignMotorista(ids, null, '');
      } else {
        const motorista = motoristas.find((m) => m.id === value);
        await onAssignMotorista(ids, value, motorista?.name ?? '');
      }
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível atribuir: ${err.message}` : 'Não foi possível atribuir o motorista.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSyncTracking = async () => {
    setIsSyncingTracking(true);
    try {
      const results = await onSyncTracking(Array.from(selectedIds));
      const okCount = results.filter((r) => r.ok && r.mappedStatus).length;
      const unmappedCount = results.filter((r) => r.ok && !r.mappedStatus).length;
      const failCount = results.filter((r) => !r.ok).length;
      alert(
        `Sincronização concluída: ${okCount} atualizada(s)`
        + (unmappedCount > 0 ? `, ${unmappedCount} com status ainda não reconhecido` : '')
        + (failCount > 0 ? `, ${failCount} falharam` : '')
        + '.'
      );
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível sincronizar: ${err.message}` : 'Não foi possível sincronizar o rastreio.');
    } finally {
      setIsSyncingTracking(false);
    }
  };

  const SortableTh = ({ sortField, label, className = 'px-4' }: { sortField: keyof Delivery; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(sortField)}
      className={`py-3 cursor-pointer select-none hover:text-primary transition-colors sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant ${className}`}
      title={`Ordenar por ${label}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === sortField ? (
          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  );

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row">

      <Sidebar
        activePage="gestao-entregas"
        onNavigate={onNavigate}
        onNovaEntrega={() => setIsNewDeliveryOpen(true)}
        onImportar={() => setIsImportOpen(true)}
        onLogout={onLogout}
        onUsuarios={user.profileType === 'master' ? () => onNavigate('usuarios') : undefined}
        onIntegracoes={user.profileType === 'master' ? () => onNavigate('integracoes') : undefined}
        onCubagem={user.profileType === 'master' ? () => onNavigate('cubagem') : undefined}
      />

      <div className="flex-1 flex flex-col min-w-0 md:min-h-0">
        <OperadorTopBar profile={user} />

        {/* Main Content Area */}
        <main className="flex-1 p-6 w-full overflow-hidden md:flex md:flex-col md:min-h-0">

          {/* Header Breadcrumbs Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:shrink-0">
            <div>
              <h1 className="font-headline text-3xl font-bold text-primary mb-1">Gestão de Entregas</h1>
              <div className="flex items-center text-on-surface-variant gap-2 text-xs">
                <span>Logística</span>
                <ChevronRight className="w-4 h-4 text-outline" />
                <span className="text-primary font-bold">Gerenciamento de Entregas</span>
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value=""
                disabled={selectedIds.size === 0 || isAssigning}
                onChange={(e) => handleAssignMotorista(e.target.value)}
                title={selectedIds.size === 0 ? 'Selecione ao menos uma entrega na tabela' : 'Atribuir motorista às entregas selecionadas'}
                className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface-variant rounded-lg font-bold text-sm hover:bg-surface-container transition-all shadow-sm bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="" disabled>
                  {isAssigning ? 'Atribuindo...' : `Atribuir Motorista${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
                </option>
                <option value="__clear__">— Remover atribuição —</option>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button
                onClick={() => setIsEtiquetaOpen(true)}
                disabled={selectedIds.size === 0}
                title={selectedIds.size === 0 ? 'Selecione ao menos uma entrega na tabela' : undefined}
                className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface-variant rounded-lg font-bold text-sm hover:bg-surface-container transition-all shadow-sm bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Tag className="w-4 h-4" />
                <span>Gerar Etiquetas{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</span>
              </button>
              <button
                onClick={handleSyncTracking}
                disabled={selectedIds.size === 0 || isSyncingTracking}
                title={selectedIds.size === 0 ? 'Selecione ao menos uma entrega na tabela' : undefined}
                className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface-variant rounded-lg font-bold text-sm hover:bg-surface-container transition-all shadow-sm bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingTracking ? 'animate-spin' : ''}`} />
                <span>{isSyncingTracking ? 'Sincronizando...' : `Atualizar Rastreio${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}</span>
              </button>
              <button
                onClick={() => exportDeliveriesToCsv(sortedDeliveries, `gestao-entregas-${new Date().toISOString().split('T')[0]}.csv`, [], volumesByDeliveryId)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:shrink-0">

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
              <p className="text-[10px] text-on-surface-variant mt-1.5">
                {metrics.noPrazoCount} no prazo · {metrics.foraDoPrazoCount} fora do prazo
              </p>
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
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col md:flex-1 md:min-h-0">

            {/* Table Controls */}
            <div className="p-4 border-b border-outline-variant flex flex-wrap gap-3 items-center justify-between bg-surface-container-low/30 md:shrink-0">
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
                  <option value="DEVOLVIDO">Devolvido</option>
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

                {/* Comprovante anexado ou não */}
                <select
                  value={comprovanteFilter}
                  onChange={(e) => setComprovanteFilter(e.target.value as '' | 'com' | 'sem')}
                  className="px-3 py-2 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="">Comprovante: Todos</option>
                  <option value="com">Com anexo</option>
                  <option value="sem">Sem anexo</option>
                </select>

                {/* Motorista Select */}
                <select
                  value={motoristaFilter}
                  onChange={(e) => setMotoristaFilter(e.target.value)}
                  className="px-3 py-2 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="">Motorista: Todos</option>
                  {motoristas.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
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
            <div className="overflow-x-auto md:flex-1 md:min-h-0 md:overflow-y-auto">
              {detailedMode ? (
                /* DENSE WIDE TABLE WITH HORIZONTAL SCROLL */
                <table className="w-full text-left border-separate border-spacing-0 min-w-[3240px]">
                  <thead className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3 w-10 sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAllOnPage}
                          className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                          title="Selecionar todos desta página"
                        />
                      </th>
                      <SortableTh sortField="remetente" label="Remetente" />
                      <SortableTh sortField="remetenteCnpj" label="CNPJ Remetente" />
                      <SortableTh sortField="nfe" label="Nº NF-e" />
                      <SortableTh sortField="pedido" label="Pedido" />
                      <SortableTh sortField="dataPedido" label="Data Pedido" />
                      <SortableTh sortField="dataExpedicao" label="Data Expedição" />
                      <SortableTh sortField="previsao" label="Previsão de Entrega" />
                      <SortableTh sortField="dataEntrega" label="Data de Entrega" />
                      <SortableTh sortField="nomeRazaoSocial" label="Destinatário" />
                      <SortableTh sortField="cnpjCpf" label="CNPJ / CPF" />
                      <SortableTh sortField="enderecoCompleto" label="Endereço" />
                      <SortableTh sortField="numero" label="Nº" />
                      <SortableTh sortField="complemento" label="Complemento" />
                      <SortableTh sortField="bairroDistrito" label="Bairro / Distrito" />
                      <SortableTh sortField="cep" label="CEP" />
                      <SortableTh sortField="municipio" label="Município" />
                      <SortableTh sortField="uf" label="UF" />
                      <SortableTh sortField="foneFax" label="Fone / Fax" />
                      <SortableTh sortField="motoristaNome" label="Motorista" />
                      <SortableTh sortField="status" label="Status / Ocorrência" />
                      <SortableTh sortField="valorCobranca" label="Valor Cobrança" className="px-4 text-right" />
                      <SortableTh sortField="valorPagamento" label="Valor Pagto" className="px-4 text-right" />
                      <th className="px-4 py-3 text-right sticky top-0 right-0 z-20 bg-surface-container-low border-b border-outline-variant shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {paginatedDeliveries.length > 0 ? (
                      paginatedDeliveries.map((del) => (
                        <tr key={del.id} className={`hover:bg-primary/5 transition-colors group ${selectedIds.has(del.id) ? 'bg-primary/5' : ''}`}>
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(del.id)}
                              onChange={() => toggleSelect(del.id)}
                              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
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
                          <td className="px-4 py-4 text-xs font-semibold text-secondary">{del.motoristaNome || '—'}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider w-fit ${
                                del.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' :
                                del.status === 'EM ROTA' ? 'bg-blue-100 text-blue-800' :
                                del.status === 'EM ATRASO' ? 'bg-amber-100 text-amber-800' :
                                del.status === 'DEVOLVIDO' ? 'bg-gray-200 text-gray-800' :
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
                          <td className="px-4 py-4 text-right sticky right-0 z-0 bg-white group-hover:bg-[#f6f8fa] transition-colors shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">
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
                        <td colSpan={24} className="text-center py-8 text-sm text-secondary font-medium">
                          Nenhuma entrega corresponde aos filtros de busca aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                /* CONCISE COMPACT TABLE */
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-5 py-3 w-10 sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAllOnPage}
                          className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                          title="Selecionar todos desta página"
                        />
                      </th>
                      <SortableTh sortField="nfe" label="NF" className="px-5" />
                      <SortableTh sortField="cliente" label="Destinatário" className="px-5" />
                      <SortableTh sortField="uf" label="UF" className="px-5" />
                      <SortableTh sortField="previsao" label="Previsão" className="px-5" />
                      <SortableTh sortField="status" label="Status" className="px-5" />
                      <SortableTh sortField="motoristaNome" label="Motorista" className="px-5" />
                      <th className="px-5 py-3 sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant">Ocorrência</th>
                      <th className="px-5 py-3 text-right sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {paginatedDeliveries.length > 0 ? (
                      paginatedDeliveries.map((del) => (
                        <tr key={del.id} className={`hover:bg-primary/5 transition-colors group ${selectedIds.has(del.id) ? 'bg-primary/5' : ''}`}>
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(del.id)}
                              onChange={() => toggleSelect(del.id)}
                              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-4 font-mono text-sm text-primary font-bold">{formatNfe(del.nfe)}</td>
                          <td className="px-5 py-4 font-bold text-sm text-on-surface">{del.cliente}</td>
                          <td className="px-5 py-4 text-sm font-semibold">{del.uf}</td>
                          <td className="px-5 py-4 text-sm font-medium">{formatDateBR(del.previsao)}</td>
                          <td className="px-5 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              del.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' :
                              del.status === 'EM ROTA' ? 'bg-blue-100 text-blue-800' :
                              del.status === 'EM ATRASO' ? 'bg-amber-100 text-amber-800' :
                              del.status === 'DEVOLVIDO' ? 'bg-gray-200 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {del.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-secondary">{del.motoristaNome || '—'}</td>
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
                        <td colSpan={9} className="text-center py-8 text-sm text-secondary font-medium">
                          Nenhuma entrega encontrada para a sua busca.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low/40 md:shrink-0">
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

      {isEtiquetaOpen && (
        <EtiquetaPrintView deliveries={selectedDeliveries} onClose={() => setIsEtiquetaOpen(false)} />
      )}

    </div>
  );
}
