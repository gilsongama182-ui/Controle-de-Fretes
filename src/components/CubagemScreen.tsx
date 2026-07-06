import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Ruler, Package, Tag } from 'lucide-react';
import { ActivePage, Delivery, User } from '../types';
import { Volume, VolumeInput } from '../lib/deliveryVolumes';
import { formatNfe } from '../lib/formatNfe';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import CubagemModal from './layout/CubagemModal';
import EtiquetaPrintView from './layout/EtiquetaPrintView';

// Referência estável — se fosse "?? []" direto na JSX, um array novo seria
// criado a cada re-render do componente, mudando a dependência do useEffect
// dentro do CubagemModal e resetando os rascunhos não salvos do usuário.
const EMPTY_VOLUMES: Volume[] = [];

interface CubagemScreenProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  deliveries: Delivery[];
  volumesByDeliveryId: Map<string, Volume[]>;
  onSaveVolumes: (deliveryId: string, volumes: VolumeInput[]) => Promise<void>;
}

export default function CubagemScreen({
  onNavigate,
  onLogout,
  user,
  deliveries,
  volumesByDeliveryId,
  onSaveVolumes,
}: CubagemScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [linesPerPage] = useState(10);
  const [cubagemDeliveryId, setCubagemDeliveryId] = useState<string | null>(null);
  const [etiquetaDeliveryId, setEtiquetaDeliveryId] = useState<string | null>(null);

  if (user.profileType !== 'operador_log' && user.profileType !== 'master') {
    return (
      <div className="p-8 text-center bg-surface min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-secondary font-medium">Acesso restrito.</p>
        <button onClick={() => onNavigate('dashboard-operador')} className="px-4 py-2 bg-primary text-white rounded">
          Voltar
        </button>
      </div>
    );
  }

  const filteredDeliveries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return deliveries;
    const termDigits = term.replace(/\D/g, '');
    return deliveries.filter((d) =>
      d.nfe.toLowerCase().includes(term) ||
      d.pedido.toLowerCase().includes(term) ||
      d.nomeRazaoSocial.toLowerCase().includes(term) ||
      (termDigits.length > 0 && d.cnpjCpf.replace(/\D/g, '').includes(termDigits)) ||
      // Chave de acesso da NF-e não aparece em tela, mas dá pra buscar por
      // ela — o time da operação lê o código de barras da nota impressa
      // direto no campo de busca, sem digitar nada.
      (termDigits.length > 0 && d.chaveAcessoNfe.includes(termDigits))
    );
  }, [deliveries, searchTerm]);

  const totalPages = Math.ceil(filteredDeliveries.length / linesPerPage);
  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * linesPerPage;
    return filteredDeliveries.slice(startIndex, startIndex + linesPerPage);
  }, [filteredDeliveries, currentPage, linesPerPage]);

  const cubagemDelivery = cubagemDeliveryId
    ? deliveries.find((d) => d.id === cubagemDeliveryId) ?? null
    : null;
  const etiquetaDelivery = etiquetaDeliveryId
    ? deliveries.find((d) => d.id === etiquetaDeliveryId) ?? null
    : null;

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">
      <Sidebar
        activePage="cubagem"
        onNavigate={onNavigate}
        onNovaEntrega={() => {}}
        onImportar={() => {}}
        onLogout={onLogout}
        onCubagem={user.profileType === 'master' ? () => onNavigate('cubagem') : undefined}
        restrictedToCubagem={user.profileType === 'operador_log'}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <OperadorTopBar profile={user} />

        <main className="flex-1 p-6 w-full overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="font-headline text-3xl font-bold text-primary mb-1">Inclusão de Cubagem</h1>
              <div className="flex items-center text-on-surface-variant gap-2 text-xs">
                <span>Logística</span>
                <ChevronRight className="w-4 h-4 text-outline" />
                <span className="text-primary font-bold">Cubagem por Volume</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-outline-variant flex flex-wrap gap-3 items-center justify-between bg-surface-container-low/30">
              <input
                type="text"
                placeholder="Buscar por NF-e, Pedido, Destinatário ou CNPJ/CPF..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full sm:w-96 pl-4 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
              />
              <span className="text-xs font-semibold text-on-surface-variant">
                Exibindo {filteredDeliveries.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant text-xs font-bold uppercase tracking-wider text-on-surface-variant sticky top-0">
                  <tr>
                    <th className="px-5 py-3">Nº NF-e</th>
                    <th className="px-5 py-3">Pedido</th>
                    <th className="px-5 py-3">Destinatário</th>
                    <th className="px-5 py-3">CNPJ / CPF</th>
                    <th className="px-5 py-3">Cubagem</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paginatedDeliveries.length > 0 ? (
                    paginatedDeliveries.map((del) => {
                      const volumeCount = volumesByDeliveryId.get(del.id)?.length ?? 0;
                      return (
                        <tr key={del.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-5 py-4 font-mono text-xs text-primary font-bold">{formatNfe(del.nfe)}</td>
                          <td className="px-5 py-4 text-xs">{del.pedido || '—'}</td>
                          <td className="px-5 py-4 text-xs text-on-surface">{del.nomeRazaoSocial}</td>
                          <td className="px-5 py-4 font-mono text-xs">{del.cnpjCpf}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider w-fit ${
                              volumeCount > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {volumeCount > 0 ? `${volumeCount} volume(s)` : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setCubagemDeliveryId(del.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-outline text-on-surface-variant rounded-lg text-xs font-bold hover:bg-secondary-container transition-colors"
                              >
                                <Ruler className="w-3.5 h-3.5" />
                                Cubagem
                              </button>
                              <button
                                onClick={() => setEtiquetaDeliveryId(del.id)}
                                title="Gerar etiqueta de remessa"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-outline text-on-surface-variant rounded-lg text-xs font-bold hover:bg-secondary-container transition-colors"
                              >
                                <Tag className="w-3.5 h-3.5" />
                                Etiqueta
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-sm text-secondary font-medium">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-8 h-8 text-outline" />
                          Nenhuma entrega encontrada para a sua busca.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-outline-variant flex items-center justify-end gap-4 bg-surface-container-low/40">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container-low disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-on-surface-variant">
                Página {totalPages === 0 ? 0 : currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container-low disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>

      <CubagemModal
        delivery={cubagemDelivery}
        volumes={(cubagemDeliveryId && volumesByDeliveryId.get(cubagemDeliveryId)) || EMPTY_VOLUMES}
        onClose={() => setCubagemDeliveryId(null)}
        onSave={onSaveVolumes}
      />

      {etiquetaDelivery && (
        <EtiquetaPrintView deliveries={[etiquetaDelivery]} onClose={() => setEtiquetaDeliveryId(null)} />
      )}
    </div>
  );
}
