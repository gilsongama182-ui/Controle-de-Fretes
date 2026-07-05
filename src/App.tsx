import { useState, useEffect, useMemo, useRef } from 'react';
import { Truck, AlertTriangle } from 'lucide-react';
import { ActivePage, Delivery } from './types';
import { Partner } from './lib/partners';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  fetchDeliveries,
  createDelivery,
  createDeliveries,
  updateDelivery,
  deleteDelivery,
  NewDeliveryInput,
} from './lib/deliveries';
import { syncTracking, SyncItemResult } from './lib/melhorEnvio';
import { fetchAllVolumes, saveVolumesForDelivery, Volume, VolumeInput } from './lib/deliveryVolumes';

// Import Screen Components
import LoginScreen from './components/LoginScreen';
import CadastroScreen from './components/CadastroScreen';
import DashboardOperadorScreen from './components/DashboardOperadorScreen';
import DashboardClienteScreen from './components/DashboardClienteScreen';
import GestaoEntregasScreen from './components/GestaoEntregasScreen';
import EdicaoEntregaScreen from './components/EdicaoEntregaScreen';
import UsuariosScreen from './components/UsuariosScreen';
import AccountStatusScreen from './components/AccountStatusScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import IntegracoesScreen from './components/IntegracoesScreen';
import CubagemScreen from './components/CubagemScreen';
import ParceirosScreen from './components/ParceirosScreen';
import CadastroParceiroScreen from './components/CadastroParceiroScreen';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
      <div className="w-14 h-14 bg-primary flex items-center justify-center rounded-xl shadow-lg animate-pulse">
        <Truck className="text-on-primary w-8 h-8" />
      </div>
      <p className="text-sm font-semibold text-on-surface-variant">Carregando sessão...</p>
    </div>
  );
}

function ProfileErrorScreen({ onRetry, onLogout }: { onRetry: () => void; onLogout: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <div className="w-14 h-14 bg-error-container/30 flex items-center justify-center rounded-xl">
        <AlertTriangle className="text-error w-8 h-8" />
      </div>
      <div>
        <p className="text-sm font-bold text-on-surface">Não foi possível carregar seu perfil.</p>
        <p className="text-xs text-on-surface-variant mt-1">Sua conta existe, mas os dados do perfil não foram encontrados. Tente novamente ou fale com o suporte.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onRetry} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold">
          Tentar novamente
        </button>
        <button onClick={onLogout} className="px-4 py-2 border border-outline-variant text-secondary rounded-lg text-sm font-bold">
          Sair
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  const { session, profile, loading, profileError, isPasswordRecovery, signOut, refreshProfile } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('login');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const lastHandledSessionId = useRef<string | null>(null);

  // Deriva a tela inicial a partir da sessão restaurada (login persiste após F5)
  // e evita sobrescrever navegação manual dentro do app.
  useEffect(() => {
    if (loading) return;
    const sessionId = session?.user.id ?? null;

    if (!sessionId) {
      if (lastHandledSessionId.current !== null) {
        setActivePage('login');
        setDeliveries([]);
        setVolumes([]);
        setSelectedDelivery(null);
      }
      lastHandledSessionId.current = null;
      return;
    }

    if (!profile || profile.id !== sessionId) return; // perfil ainda carregando
    if (lastHandledSessionId.current === sessionId) return; // já redirecionado nesta sessão

    lastHandledSessionId.current = sessionId;
    // Cadastro pendente/rejeitado não é redirecionado pra nenhum dashboard —
    // a tela de status (renderizada antes do switch abaixo) intercepta primeiro.
    if (profile.status === 'aprovado') {
      // Depois do redirect de volta do OAuth da Melhor Envio (navegação de
      // página inteira, o estado do app reseta), manda pra Integrações em
      // vez do dashboard padrão, senão o aviso de conectado/erro se perde.
      const hasMelhorEnvioCallback = new URLSearchParams(window.location.search).has('melhor_envio');
      if (hasMelhorEnvioCallback && profile.profileType === 'master') {
        setActivePage('integracoes');
      } else if (profile.profileType === 'cliente') {
        setActivePage('dashboard-cliente');
      } else if (profile.profileType === 'operador_log') {
        setActivePage('cubagem');
      } else {
        setActivePage('dashboard-operador');
      }
    }
  }, [loading, session, profile]);

  // Busca as entregas do Supabase assim que a sessão + perfil estão prontos
  // (o RLS já limita o resultado a operador=tudo / cliente=próprias entregas).
  useEffect(() => {
    if (!session || !profile || profile.status !== 'aprovado') return;
    let active = true;
    fetchDeliveries()
      .then((rows) => {
        if (active) setDeliveries(rows);
      })
      .catch((err) => console.error('Falha ao buscar entregas:', err));
    // RLS devolve [] pra quem não tem select em delivery_volumes (ex: cliente)
    // sem lançar erro, então não precisa de tratamento especial por papel aqui.
    fetchAllVolumes()
      .then((rows) => {
        if (active) setVolumes(rows);
      })
      .catch((err) => console.error('Falha ao buscar cubagem:', err));
    return () => {
      active = false;
    };
  }, [session?.user.id, profile?.id]);

  const volumesByDeliveryId = useMemo(() => {
    const map = new Map<string, Volume[]>();
    for (const volume of volumes) {
      const list = map.get(volume.deliveryId);
      if (list) list.push(volume);
      else map.set(volume.deliveryId, [volume]);
    }
    return map;
  }, [volumes]);

  const handleLogout = async () => {
    await signOut();
  };

  const handleAddDelivery = async (input: NewDeliveryInput) => {
    const created = await createDelivery(input);
    setDeliveries((prev) => [created, ...prev]);
  };

  const handleImportDeliveries = async (inputs: NewDeliveryInput[]) => {
    const created = await createDeliveries(inputs);
    setDeliveries((prev) => [...created, ...prev]);
  };

  const handleDeleteDelivery = async (id: string) => {
    await deleteDelivery(id);
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSelectDeliveryForEdit = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setActivePage('edicao-entrega');
  };

  const handleUpdateDelivery = async (id: string, patch: Partial<Delivery>) => {
    const updated = await updateDelivery(id, patch);
    setDeliveries((prev) => prev.map((d) => (d.id === id ? updated : d)));
    setSelectedDelivery(updated);
  };

  const handleSelectPartnerForEdit = (partner: Partner) => {
    setSelectedPartner(partner);
    setActivePage('cadastro-parceiro');
  };

  const handleNovoCadastroParceiro = () => {
    setSelectedPartner(null);
    setActivePage('cadastro-parceiro');
  };

  const handleSaveVolumes = async (deliveryId: string, volumeInputs: VolumeInput[]) => {
    const saved = await saveVolumesForDelivery(deliveryId, volumeInputs);
    setVolumes((prev) => [...prev.filter((v) => v.deliveryId !== deliveryId), ...saved]);
  };

  const handleSyncTracking = async (ids: string[]): Promise<SyncItemResult[]> => {
    const { results, deliveries: updated } = await syncTracking(ids);
    setDeliveries((prev) => prev.map((d) => updated.find((u) => u.id === d.id) ?? d));
    if (selectedDelivery) {
      const refreshed = updated.find((u) => u.id === selectedDelivery.id);
      if (refreshed) setSelectedDelivery(refreshed);
    }
    return results;
  };

  if (loading) return <LoadingScreen />;
  if (session && isPasswordRecovery) {
    return <ResetPasswordScreen />;
  }
  if (session && profileError) {
    return <ProfileErrorScreen onRetry={refreshProfile} onLogout={handleLogout} />;
  }
  if (session && profile && profile.status !== 'aprovado') {
    return <AccountStatusScreen status={profile.status} onLogout={handleLogout} />;
  }

  switch (activePage) {
    case 'cadastro':
      return <CadastroScreen onNavigate={setActivePage} />;

    case 'dashboard-operador':
      if (!profile) return <LoadingScreen />;
      return (
        <DashboardOperadorScreen
          onNavigate={setActivePage}
          onLogout={handleLogout}
          user={profile}
          deliveries={deliveries}
          volumesByDeliveryId={volumesByDeliveryId}
          onAddDelivery={handleAddDelivery}
          onImportDeliveries={handleImportDeliveries}
          onSelectDeliveryForEdit={handleSelectDeliveryForEdit}
        />
      );

    case 'dashboard-cliente':
      if (!profile) return <LoadingScreen />;
      return (
        <DashboardClienteScreen
          onLogout={handleLogout}
          user={profile}
          deliveries={deliveries}
        />
      );

    case 'gestao-entregas':
      if (!profile) return <LoadingScreen />;
      return (
        <GestaoEntregasScreen
          onNavigate={setActivePage}
          onLogout={handleLogout}
          user={profile}
          deliveries={deliveries}
          volumesByDeliveryId={volumesByDeliveryId}
          onDeleteDelivery={handleDeleteDelivery}
          onSelectDeliveryForEdit={handleSelectDeliveryForEdit}
          onAddDelivery={handleAddDelivery}
          onImportDeliveries={handleImportDeliveries}
          onUpdateDelivery={handleUpdateDelivery}
          onSyncTracking={handleSyncTracking}
        />
      );

    case 'edicao-entrega':
      if (!profile) return <LoadingScreen />;
      return (
        <EdicaoEntregaScreen
          onNavigate={setActivePage}
          onLogout={handleLogout}
          user={profile}
          delivery={selectedDelivery}
          deliveries={deliveries}
          onUpdateDelivery={handleUpdateDelivery}
          onAddDelivery={handleAddDelivery}
          onImportDeliveries={handleImportDeliveries}
          onSyncTracking={handleSyncTracking}
        />
      );

    case 'usuarios':
      if (!profile) return <LoadingScreen />;
      return (
        <UsuariosScreen
          onNavigate={setActivePage}
          onLogout={handleLogout}
          user={profile}
          deliveries={deliveries}
          onAddDelivery={handleAddDelivery}
          onImportDeliveries={handleImportDeliveries}
        />
      );

    case 'integracoes':
      if (!profile) return <LoadingScreen />;
      return (
        <IntegracoesScreen
          onNavigate={setActivePage}
          onLogout={handleLogout}
          user={profile}
          deliveries={deliveries}
          onAddDelivery={handleAddDelivery}
          onImportDeliveries={handleImportDeliveries}
        />
      );

    case 'cubagem':
      if (!profile) return <LoadingScreen />;
      return (
        <CubagemScreen
          onNavigate={setActivePage}
          onLogout={handleLogout}
          user={profile}
          deliveries={deliveries}
          volumesByDeliveryId={volumesByDeliveryId}
          onSaveVolumes={handleSaveVolumes}
        />
      );

    case 'parceiros':
      if (!profile) return <LoadingScreen />;
      return (
        <ParceirosScreen
          onNavigate={setActivePage}
          onLogout={handleLogout}
          user={profile}
          onNovoCadastro={handleNovoCadastroParceiro}
          onSelectForEdit={handleSelectPartnerForEdit}
        />
      );

    case 'cadastro-parceiro':
      if (!profile) return <LoadingScreen />;
      return (
        <CadastroParceiroScreen
          onNavigate={setActivePage}
          onLogout={handleLogout}
          user={profile}
          partner={selectedPartner}
        />
      );

    case 'login':
    default:
      return <LoginScreen onNavigate={setActivePage} />;
  }
}

export default function App() {
  return (
    <div className="min-h-screen font-sans selection:bg-primary/20 selection:text-primary">
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </div>
  );
}
