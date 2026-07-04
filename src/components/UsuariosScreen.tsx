import React, { useEffect, useState } from 'react';
import { Shield, Mail, Check, X as XIcon } from 'lucide-react';
import { ActivePage, User, Genero, Delivery, AccountStatus } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { fetchProfiles, updateProfileRole, updateProfileGenero, updateProfileStatus, updateProfileDocument, ProfileRecord } from '../lib/profiles';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import MobileBottomNav from './layout/MobileBottomNav';
import NovaEntregaModal from './layout/NovaEntregaModal';
import ImportModal from './layout/ImportModal';
import Avatar from './layout/Avatar';

interface UsuariosScreenProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  deliveries: Delivery[];
  onAddDelivery: (input: NewDeliveryInput) => Promise<void>;
  onImportDeliveries: (inputs: NewDeliveryInput[]) => Promise<void>;
}

const ROLE_LABEL: Record<ProfileRecord['profileType'], string> = {
  cliente: 'Cliente',
  operador: 'Operador',
  operador_log: 'Operador Log',
  master: 'Master',
};

const GENERO_LABEL: Record<Genero, string> = {
  nao_informado: 'Não informado',
  feminino: 'Feminino',
  masculino: 'Masculino',
};

const STATUS_LABEL: Record<AccountStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const STATUS_BADGE_CLASS: Record<AccountStatus, string> = {
  pendente: 'bg-amber-100 text-amber-800',
  aprovado: 'bg-green-100 text-green-800',
  rejeitado: 'bg-red-100 text-red-800',
};

export default function UsuariosScreen({
  onNavigate,
  onLogout,
  user,
  deliveries,
  onAddDelivery,
  onImportDeliveries
}: UsuariosScreenProps) {
  const { requestPasswordReset } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [resetSendingId, setResetSendingId] = useState<string | null>(null);
  const [resetSentId, setResetSentId] = useState<string | null>(null);
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, string>>({});

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

  const handleGeneroChange = async (id: string, genero: Genero) => {
    setSavingId(id);
    try {
      const updated = await updateProfileGenero(id, genero);
      setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível atualizar: ${err.message}` : 'Não foi possível atualizar o gênero do usuário.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDocumentBlur = async (id: string, currentValue: string) => {
    const draft = documentDrafts[id]?.trim();
    if (draft === undefined || draft === currentValue) return;
    setSavingId(id);
    try {
      const updated = await updateProfileDocument(id, draft);
      setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível atualizar: ${err.message}` : 'Não foi possível atualizar o documento do usuário.');
    } finally {
      setSavingId(null);
      setDocumentDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleStatusChange = async (id: string, status: AccountStatus) => {
    setSavingId(id);
    try {
      const updated = await updateProfileStatus(id, status);
      setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível atualizar: ${err.message}` : 'Não foi possível atualizar o status do usuário.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSendPasswordReset = async (id: string, email: string) => {
    setResetSendingId(id);
    setResetSentId(null);
    try {
      const { error } = await requestPasswordReset(email);
      if (error) throw error;
      setResetSentId(id);
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível enviar: ${err.message}` : 'Não foi possível enviar o e-mail de redefinição.');
    } finally {
      setResetSendingId(null);
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
        onIntegracoes={() => onNavigate('integracoes')}
        onCubagem={() => onNavigate('cubagem')}
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
                  <th className="px-5 py-3"></th>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">E-mail</th>
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-5 py-3">Papel</th>
                  <th className="px-5 py-3">Gênero (avatar)</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-sm text-secondary">Carregando...</td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-sm text-secondary">Nenhum usuário encontrado.</td>
                  </tr>
                ) : (
                  profiles.map((p) => (
                    <tr key={p.id} className={`hover:bg-primary/5 transition-colors ${p.status === 'pendente' ? 'bg-amber-50/60' : ''}`}>
                      <td className="px-5 py-4">
                        <Avatar genero={p.genero} name={p.name} className="w-8 h-8" />
                      </td>
                      <td className="px-5 py-4 font-semibold text-sm text-on-surface">{p.name || '—'}</td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">{p.email}</td>
                      <td className="px-5 py-4">
                        <input
                          type="text"
                          value={documentDrafts[p.id] ?? p.document}
                          disabled={savingId === p.id}
                          onChange={(e) => setDocumentDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          onBlur={() => handleDocumentBlur(p.id, p.document)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className="w-full min-w-[140px] px-2 py-1.5 font-mono text-xs bg-transparent border border-transparent hover:border-outline-variant focus:border-primary focus:bg-white rounded-lg outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-colors"
                        />
                      </td>
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
                      <td className="px-5 py-4">
                        <select
                          value={p.genero}
                          disabled={savingId === p.id}
                          onChange={(e) => handleGeneroChange(p.id, e.target.value as Genero)}
                          className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer disabled:opacity-50"
                        >
                          {(Object.keys(GENERO_LABEL) as Genero[]).map((g) => (
                            <option key={g} value={g}>{GENERO_LABEL[g]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        {p.status === 'pendente' ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE_CLASS[p.status]}`}>
                              {STATUS_LABEL[p.status]}
                            </span>
                            <button
                              type="button"
                              disabled={savingId === p.id}
                              onClick={() => handleStatusChange(p.id, 'aprovado')}
                              title="Aprovar acesso"
                              className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={savingId === p.id}
                              onClick={() => handleStatusChange(p.id, 'rejeitado')}
                              title="Rejeitar acesso"
                              className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <select
                            value={p.status}
                            disabled={savingId === p.id || p.id === user.id}
                            title={p.id === user.id ? 'Você não pode alterar o próprio status' : undefined}
                            onChange={(e) => handleStatusChange(p.id, e.target.value as AccountStatus)}
                            className={`px-3 py-1.5 border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50 ${STATUS_BADGE_CLASS[p.status]}`}
                          >
                            {(Object.keys(STATUS_LABEL) as AccountStatus[]).map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={resetSendingId === p.id}
                          onClick={() => handleSendPasswordReset(p.id, p.email)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-semibold text-secondary hover:bg-surface-container transition-colors disabled:opacity-50"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {resetSendingId === p.id ? 'Enviando...' : resetSentId === p.id ? 'E-mail enviado!' : 'Redefinir senha'}
                        </button>
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
      <ImportModal open={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={onImportDeliveries} existingDeliveries={deliveries} />
    </div>
  );
}
