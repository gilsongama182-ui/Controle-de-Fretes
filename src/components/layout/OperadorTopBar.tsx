import React from 'react';
import { Search, Bell } from 'lucide-react';
import { User } from '../../types';

interface OperadorTopBarProps {
  profile: User;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export default function OperadorTopBar({ profile, searchValue, onSearchChange }: OperadorTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex justify-between items-center w-full px-6 h-16 bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-4">
        <img src="/logo-wlogis.png" alt="WLogis" className="h-10 w-auto shrink-0" />
      </div>

      <div className="flex items-center gap-4">
        {onSearchChange && (
          <div className="hidden lg:flex items-center bg-surface-container rounded-full px-4 py-1.5 border border-outline-variant">
            <Search className="w-4 h-4 text-outline" />
            <input
              type="text"
              placeholder="Buscar entrega..."
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-xs w-48 ml-2 outline-none"
            />
          </div>
        )}

        <button
          onClick={() => alert('Você possui 2 novas notificações de ocorrências logísticas.')}
          className="p-2 text-secondary hover:bg-secondary-container/50 rounded-full transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
        </button>

        <div className="h-8 w-px bg-outline-variant"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-primary">{profile.name}</p>
            <p className="text-[9px] text-secondary font-semibold tracking-wider">UNIDADE SÃO PAULO</p>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
            <img
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAz0rWKkQNtnmB0U1opX2Yx7LsuXpYZnjNyQ7CbTkcXaa7fGUuYLdc3F_tEs56-J140PKcjxE1NP9TiAYaEdyOENmStJvTS5S-Ot0lg4Vn5hhvkgLLZENKc2mCTUtP-_QDyBS3jj7cz6sdoEhW6K2c0YTvKAtixejeV-ya4xCIxw9tj433V0cxU2C6L3ElD1Rn1Y4J-7E1ISnYLQ7QoCT6FXFSGcBA4IG1F_x-uPFLVYSXUAN-x7kAo7w"
              alt={`${profile.name} profile`}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
