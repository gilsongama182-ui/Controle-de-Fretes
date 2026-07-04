import { LayoutDashboard, Truck, Users, FileUp, PlusCircle, Settings, LogOut, Ruler } from 'lucide-react';
import { ActivePage } from '../../types';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onNovaEntrega: () => void;
  onImportar: () => void;
  onLogout: () => void;
  onUsuarios?: () => void;
  onIntegracoes?: () => void;
  onCubagem?: () => void;
  // Operador Log só enxerga a tela de Cubagem — os outros itens dependem de
  // escrita em "deliveries"/importação, que a RLS bloqueia pra esse papel.
  restrictedToCubagem?: boolean;
}

export default function Sidebar({
  activePage,
  onNavigate,
  onNovaEntrega,
  onImportar,
  onLogout,
  onUsuarios,
  onIntegracoes,
  onCubagem,
  restrictedToCubagem,
}: SidebarProps) {
  const navItemClass = (page: ActivePage) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-colors ${
      activePage === page
        ? 'bg-secondary-container text-on-secondary-container font-bold'
        : 'text-on-surface-variant hover:bg-surface-variant/40'
    }`;

  return (
    <aside className="w-full md:w-[280px] bg-surface-container-low border-r border-outline-variant flex flex-col py-6 px-4 shrink-0 md:sticky md:top-0 md:h-screen">
      <div className="px-3 mb-8">
        <img src="/logo-wlogis.png" alt="WLogis" className="h-12 w-auto mb-1" />
        <p className="text-xs text-on-surface-variant font-semibold tracking-wider uppercase opacity-70">
          Painel de Operações
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {!restrictedToCubagem && (
          <>
            <button onClick={() => onNavigate('dashboard-operador')} className={navItemClass('dashboard-operador')}>
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            <button onClick={() => onNavigate('gestao-entregas')} className={navItemClass('gestao-entregas')}>
              <Truck className="w-5 h-5" />
              <span>Gerenciamento</span>
            </button>

            <button
              onClick={onUsuarios ?? (() => alert('Filtro de usuários logísticos simulado.'))}
              className={onUsuarios ? navItemClass('usuarios') : 'w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/40 rounded-lg text-left text-sm transition-colors'}
            >
              <Users className="w-5 h-5" />
              <span>Usuários</span>
            </button>
          </>
        )}

        {(restrictedToCubagem || onCubagem) && (
          <button
            onClick={restrictedToCubagem ? () => onNavigate('cubagem') : onCubagem}
            className={navItemClass('cubagem')}
          >
            <Ruler className="w-5 h-5" />
            <span>Inclusão Cubagem</span>
          </button>
        )}

        {!restrictedToCubagem && (
          <button
            onClick={onImportar}
            className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/40 rounded-lg text-left text-sm transition-colors"
          >
            <FileUp className="w-5 h-5" />
            <span>Importação</span>
          </button>
        )}
      </nav>

      {!restrictedToCubagem && (
        <div className="px-2 mb-6">
          <button
            onClick={onNovaEntrega}
            className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:brightness-110 transition-all shadow-md text-sm"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Nova Entrega</span>
          </button>
        </div>
      )}

      <div className="border-t border-outline-variant pt-4 space-y-1">
        {!restrictedToCubagem && (
          <button
            onClick={onIntegracoes ?? (() => alert('Configurações do sistema de logística.'))}
            className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-variant/40 rounded-lg text-left text-xs transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-error hover:bg-error-container/20 rounded-lg text-left text-xs transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
