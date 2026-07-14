import { LogOut } from 'lucide-react';
import { Delivery, User } from '../../types';
import { DeliveryOcorrencia } from '../../lib/deliveryOcorrencias';
import Avatar from './Avatar';
import NotificacoesFalha from './NotificacoesFalha';

interface ClienteHeaderProps {
  profile: User;
  onLogout: () => void;
  deliveries: Delivery[];
  onMarkFalhaLida: (id: string) => Promise<void>;
  ocorrenciasByDeliveryId: Map<string, DeliveryOcorrencia[]>;
}

export default function ClienteHeader({ profile, onLogout, deliveries, onMarkFalhaLida, ocorrenciasByDeliveryId }: ClienteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 h-16 bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-2">
        <img src="/logo-wlogis.png" alt="WLogis" className="h-12 w-auto" />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <NotificacoesFalha deliveries={deliveries} onMarkRead={onMarkFalhaLida} ocorrenciasByDeliveryId={ocorrenciasByDeliveryId} />

        <div className="h-8 w-px bg-outline-variant hidden sm:block"></div>

        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-primary">{profile.name}</p>
          <p className="text-[9px] text-secondary font-semibold tracking-wider">{profile.document}</p>
        </div>

        <button
          onClick={onLogout}
          className="p-2 hover:bg-error-container/20 rounded-full text-error transition-colors flex items-center gap-1"
          title="Sair da Conta"
        >
          <LogOut className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant">
          <Avatar genero={profile.genero} name={profile.name} className="w-full h-full" />
        </div>
      </div>
    </header>
  );
}
