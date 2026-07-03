import React from 'react';
import { Clock, ShieldX } from 'lucide-react';
import { AccountStatus } from '../types';

interface AccountStatusScreenProps {
  status: Exclude<AccountStatus, 'aprovado'>;
  onLogout: () => void;
}

const CONTENT: Record<Exclude<AccountStatus, 'aprovado'>, { icon: React.ReactNode; title: string; message: string }> = {
  pendente: {
    icon: <Clock className="w-8 h-8 text-secondary" />,
    title: 'Cadastro em análise',
    message: 'Seu cadastro foi recebido e está aguardando aprovação de um administrador. Você receberá acesso assim que for liberado.',
  },
  rejeitado: {
    icon: <ShieldX className="w-8 h-8 text-error" />,
    title: 'Acesso não aprovado',
    message: 'Seu acesso a esta conta não foi aprovado. Entre em contato com o administrador do sistema para mais informações.',
  },
};

export default function AccountStatusScreen({ status, onLogout }: AccountStatusScreenProps) {
  const { icon, title, message } = CONTENT[status];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <img src="/logo-wlogis.png" alt="WLogis" className="h-14 w-auto mb-2" />
      <div className="w-14 h-14 bg-secondary-container/30 flex items-center justify-center rounded-xl">
        {icon}
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-bold text-on-surface">{title}</p>
        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{message}</p>
      </div>
      <button onClick={onLogout} className="px-4 py-2 border border-outline-variant text-secondary rounded-lg text-sm font-bold mt-2">
        Sair
      </button>
    </div>
  );
}
