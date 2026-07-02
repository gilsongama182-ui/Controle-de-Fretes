import React from 'react';
import { LayoutDashboard, Truck, FileUp } from 'lucide-react';
import { ActivePage } from '../../types';

interface MobileBottomNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onImportar: () => void;
}

export default function MobileBottomNav({ activePage, onNavigate, onImportar }: MobileBottomNavProps) {
  const itemClass = (page: ActivePage) => `flex flex-col items-center gap-1 ${activePage === page ? 'text-primary' : 'text-secondary'}`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-outline-variant flex justify-around py-2.5 px-2 z-40">
      <button onClick={() => onNavigate('dashboard-operador')} className={itemClass('dashboard-operador')}>
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] font-bold">Dashboard</span>
      </button>
      <button onClick={() => onNavigate('gestao-entregas')} className={itemClass('gestao-entregas')}>
        <Truck className="w-5 h-5" />
        <span className="text-[10px]">Gestão</span>
      </button>
      <button onClick={onImportar} className="flex flex-col items-center gap-1 text-secondary">
        <FileUp className="w-5 h-5" />
        <span className="text-[10px]">Importar</span>
      </button>
    </nav>
  );
}
