import React from 'react';
import { HelpCircle, Bell, LogOut } from 'lucide-react';
import { User } from '../../types';

interface ClienteHeaderProps {
  profile: User;
  onLogout: () => void;
}

export default function ClienteHeader({ profile, onLogout }: ClienteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 h-16 bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-2">
        <img src="/logo-wlogis.png" alt="WLogis" className="h-10 w-auto" />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => alert('Manual de instruções e suporte para rastreamento de cargas.')}
          className="p-2 hover:bg-secondary-container/50 transition-colors duration-200 rounded-full text-secondary"
          title="Suporte"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <button
          onClick={() => alert('Sem novos alertas para sua conta de cliente.')}
          className="p-2 hover:bg-secondary-container/50 transition-colors duration-200 rounded-full text-secondary relative"
          title="Notificações"
        >
          <Bell className="w-5 h-5" />
        </button>

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

        <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden border border-outline-variant">
          <img
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-Juk46gp0KBrUi6xoczqiPNSqNnrdOAH3g4uj7pzQ8mulHE4T4mISWB3hspWSnMGJrPuhBMDnFuLNkpD5D8HYarW0vJnr-tl9mKkP4yrNslgIN88CesZ8UDwivmNpOmI-O1ziIlH0RnNp5ZNshTg4VSvgkhbXkgmWiMts8tpyij-9QicyzYJFFxBtP0cpvoE42FJMB1EGGJgqFxFbZK33RNVlrXQkgoKR6RqiNoh7oodA7o7J7w-BiA"
            alt={`${profile.name} profile`}
          />
        </div>
      </div>
    </header>
  );
}
