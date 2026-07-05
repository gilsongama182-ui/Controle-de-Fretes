import { Search } from 'lucide-react';
import { User } from '../../types';
import Avatar from './Avatar';

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

        <div className="h-8 w-px bg-outline-variant"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-primary">{profile.name}</p>
            <p className="text-[9px] text-secondary font-semibold tracking-wider">UNIDADE SÃO PAULO</p>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
            <Avatar genero={profile.genero} name={profile.name} className="w-full h-full" />
          </div>
        </div>
      </div>
    </header>
  );
}
