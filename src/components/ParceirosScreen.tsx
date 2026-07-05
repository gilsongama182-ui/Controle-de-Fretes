import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, PlusCircle, Edit, Trash2, Handshake, Download } from 'lucide-react';
import { ActivePage, User } from '../types';
import { Partner, fetchPartners, deletePartner } from '../lib/partners';
import { exportPartnersToCsv } from '../lib/exportPartnersCsv';
import { formatCpfCnpj } from '../lib/formatCpfCnpj';
import { formatPhoneBR } from '../lib/formatPhone';
import { getErrorMessage } from '../lib/errorMessage';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import MobileBottomNav from './layout/MobileBottomNav';

interface ParceirosScreenProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  onNovoCadastro: () => void;
  onSelectForEdit: (partner: Partner) => void;
}

const TIPO_LABEL: Record<Partner['tipo'], string> = {
  agregado: 'Agregado',
  parceiro: 'Parceiro',
};

export default function ParceirosScreen({
  onNavigate,
  onLogout,
  user,
  onNovoCadastro,
  onSelectForEdit,
}: ParceirosScreenProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [linesPerPage] = useState(10);

  useEffect(() => {
    fetchPartners()
      .then(setPartners)
      .catch((err) => console.error('Falha ao buscar agregados/parceiros:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredPartners = useMemo(() => {
    let result = [...partners];
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      const termDigits = term.replace(/\D/g, '');
      result = result.filter((p) =>
        p.nome.toLowerCase().includes(term) ||
        p.nomeFantasia.toLowerCase().includes(term) ||
        (termDigits.length > 0 && p.cpfCnpj.replace(/\D/g, '').includes(termDigits)) ||
        (termDigits.length > 0 && p.telefone.replace(/\D/g, '').includes(termDigits))
      );
    }
    if (tipoFilter) result = result.filter((p) => p.tipo === tipoFilter);
    if (statusFilter) result = result.filter((p) => p.status === statusFilter);
    return result;
  }, [partners, searchTerm, tipoFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tipoFilter, statusFilter]);

  const totalPages = Math.ceil(filteredPartners.length / linesPerPage);
  const paginatedPartners = useMemo(() => {
    const startIndex = (currentPage - 1) * linesPerPage;
    return filteredPartners.slice(startIndex, startIndex + linesPerPage);
  }, [filteredPartners, currentPage, linesPerPage]);

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja remover o cadastro de "${nome}"? Os documentos anexados também serão removidos.`)) return;
    try {
      await deletePartner(id);
      setPartners((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(`Não foi possível remover: ${getErrorMessage(err, 'erro desconhecido')}`);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">
      <Sidebar
        activePage="parceiros"
        onNavigate={onNavigate}
        onNovaEntrega={() => {}}
        onImportar={() => {}}
        onLogout={onLogout}
        onUsuarios={user.profileType === 'master' ? () => onNavigate('usuarios') : undefined}
        onIntegracoes={user.profileType === 'master' ? () => onNavigate('integracoes') : undefined}
        onCubagem={user.profileType === 'master' ? () => onNavigate('cubagem') : undefined}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <OperadorTopBar profile={user} />

        <main className="flex-1 p-6 w-full overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="font-headline text-3xl font-bold text-primary mb-1">Agregados e Parceiros</h1>
              <div className="flex items-center text-on-surface-variant gap-2 text-xs">
                <span>Logística</span>
                <ChevronRight className="w-4 h-4 text-outline" />
                <span className="text-primary font-bold">Cadastro de Agregados e Parceiros</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => exportPartnersToCsv(filteredPartners, `agregados-parceiros-${new Date().toISOString().split('T')[0]}.csv`)}
                className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface-variant rounded-lg font-bold text-sm hover:bg-surface-container transition-all shadow-sm bg-white"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Relatório</span>
              </button>
              <button
                onClick={onNovoCadastro}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Novo Cadastro</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-outline-variant flex flex-wrap gap-3 items-center justify-between bg-surface-container-low/30">
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-72 pl-4 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
                />

                <select
                  value={tipoFilter}
                  onChange={(e) => setTipoFilter(e.target.value)}
                  className="px-3 py-2 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="">Tipo: Todos</option>
                  <option value="agregado">Agregado</option>
                  <option value="parceiro">Parceiro</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="">Status: Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <span className="text-xs font-semibold text-on-surface-variant">
                Exibindo {filteredPartners.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant text-xs font-bold uppercase tracking-wider text-on-surface-variant sticky top-0">
                  <tr>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Nome / Razão Social</th>
                    <th className="px-5 py-3">CPF / CNPJ</th>
                    <th className="px-5 py-3">Telefone</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paginatedPartners.length > 0 ? (
                    paginatedPartners.map((p) => (
                      <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider w-fit ${
                            p.tipo === 'agregado' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {TIPO_LABEL[p.tipo]}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-on-surface">{p.nome}</td>
                        <td className="px-5 py-4 font-mono text-xs">{formatCpfCnpj(p.cpfCnpj)}</td>
                        <td className="px-5 py-4 font-mono text-xs">{formatPhoneBR(p.telefone) || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider w-fit ${
                            p.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => onSelectForEdit(p)}
                              className="p-1.5 text-on-surface-variant hover:bg-secondary-container rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.nome)}
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
                      <td colSpan={6} className="text-center py-8 text-sm text-secondary font-medium">
                        <div className="flex flex-col items-center gap-2">
                          <Handshake className="w-8 h-8 text-outline" />
                          {loading ? 'Carregando...' : 'Nenhum agregado ou parceiro cadastrado ainda.'}
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

      <MobileBottomNav activePage="parceiros" onNavigate={onNavigate} onImportar={() => {}} />
    </div>
  );
}
