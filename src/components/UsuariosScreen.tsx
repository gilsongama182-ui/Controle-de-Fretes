import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { ActivePage, User } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { fetchProfiles, updateProfileRole, ProfileRecord } from '../lib/profiles';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import MobileBottomNav from './layout/MobileBottomNav';
import NovaEntregaModal from './layout/NovaEntregaModal';
import ImportModal from './layout/ImportModal';

interface UsuariosScreenProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  onAddDelivery: (input: NewDeliveryInput) => Promise<void>;
  onImportDelivery: (input: NewDeliveryInput) => Promise<void>;
}

const ROLE_LABEL: Record<ProfileRecord['profileType'], string> = {
  cliente: 'Cliente',
  operador: 'Operador',
  master: 'Master',
};

export default function UsuariosScreen({
  onNavigate,
  onLogout,
  user,
  onAddDelivery,
  onImportDelivery
}: UsuariosScreenProps) {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    if (user.profileType !== 'master') return;
    fetchProfiles()
      .then(setProfiles)
      .catch((err) => console.error('Falha ao buscar usuários:', err))
      .finally(() => setLoading(false));
  }, [user.profileType]);

  if (user.profileType !== 'master') {
    return (
      <div className="p-8 text-center bg-surface min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-secondary font-medium">Acesso restrito a administradores.</p>
        <button onClick={() => onNavigate('dashboard-operador')} className="px-4 py-2 bg-primary text-white rounded">
          Voltar
        </button>
      </div>
    );
  }

  const handleRoleChange = async (id: string, profileType: ProfileRecord['profileType']) => {
    setSavingId(id);
    try {
      const updated = await updateProfileRole(id, profileType);
      setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível atualizar: ${err.message}` : 'Não foi possível atualizar o papel do usuário.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">
      <Sidebar
        activePage="usuarios"
        onNavigate={onNavigate}
        onNovaEntrega={() => setIsNewDeliveryOpen(true)}
        onImportar={() => setIsImportOpen(true)}
        onLogout={onLogout}
        onUsuarios={() => onNavigate('usuarios')}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <OperadorTopBar profile={user} />

        <main className="flex-1 p-6 w-full">
          <div className="mb-6">
            <h1 className="font-headline text-3xl font-bold text-primary mb-1 flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" />
              <span>Usuários</span>
            </h1>
            <p className="text-sm text-secondary">Gerencie os papéis de acesso de clientes, operadores e administradores.</p>
          </div>

          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">E-mail</th>
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-5 py-3">Papel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-sm text-secondary">Carregando...</td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-sm text-secondary">Nenhum usuário encontrado.</td>
                  </tr>
                ) : (
                  profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-5 py-4 font-semibold text-sm text-on-surface">{p.name || '—'}</td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">{p.email}</td>
                      <td className="px-5 py-4 font-mono text-xs text-on-surface-variant">{p.document}</td>
                      <td className="px-5 py-4">
                        <select
                          value={p.profileType}
                          disabled={savingId === p.id || p.id === user.id}
                          title={p.id === user.id ? 'Você não pode alterar o próprio papel' : undefined}
                          onChange={(e) => handleRoleChange(p.id, e.target.value as ProfileRecord['profileType'])}
                          className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer disabled:opacity-50"
                        >
                          {(Object.keys(ROLE_LABEL) as ProfileRecord['profileType'][]).map((role) => (
                            <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <MobileBottomNav activePage="usuarios" onNavigate={onNavigate} onImportar={() => setIsImportOpen(true)} />

      <NovaEntregaModal open={isNewDeliveryOpen} onClose={() => setIsNewDeliveryOpen(false)} onCreate={onAddDelivery} />
      <ImportModal open={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={onImportDelivery} />
    </div>
  );
}
