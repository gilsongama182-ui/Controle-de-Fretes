import React, { useState, useEffect } from 'react';
import {
  ChevronRight, Calendar, Landmark, MapPin, Save, ArrowLeft, ClipboardCopy, RefreshCw, Paperclip, Plus, Trash2, AlertTriangle
} from 'lucide-react';
import { ActivePage, AtrasoResponsabilidade, Delivery, DeliveryStatus, User } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { fetchMotoristas, ProfileRecord } from '../lib/profiles';
import { formatNfe } from '../lib/formatNfe';
import { formatDateBR } from '../lib/formatDate';
import { SyncItemResult } from '../lib/melhorEnvio';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import MobileBottomNav from './layout/MobileBottomNav';
import NovaEntregaModal from './layout/NovaEntregaModal';
import ImportModal from './layout/ImportModal';
import ComprovanteModal from './layout/ComprovanteModal';
import { DeliveryComprovante } from '../lib/comprovantes';
import { DeliveryOcorrencia, TipoOcorrencia } from '../lib/deliveryOcorrencias';

const TIPOS_OCORRENCIA: TipoOcorrencia[] = ['DESTINATÁRIO AUSENTE', 'ENDEREÇO INCORRETO', 'RECUSADO PELO DESTINATÁRIO'];

interface EdicaoEntregaProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  delivery: Delivery | null;
  deliveries: Delivery[];
  comprovantesByDeliveryId: Map<string, DeliveryComprovante[]>;
  ocorrenciasByDeliveryId: Map<string, DeliveryOcorrencia[]>;
  onUpdateDelivery: (id: string, patch: Partial<Delivery>) => Promise<void>;
  onAddDelivery: (input: NewDeliveryInput) => Promise<void>;
  onImportDeliveries: (inputs: NewDeliveryInput[]) => Promise<void>;
  onSyncTracking: (ids: string[]) => Promise<SyncItemResult[]>;
  onUploadComprovante: (deliveryId: string, file: File) => Promise<void>;
  onRemoveComprovante: (id: string, path: string) => Promise<void>;
  onAddOcorrencia: (deliveryId: string, tipo: TipoOcorrencia, dataOcorrencia: string) => Promise<void>;
  onRemoveOcorrencia: (id: string) => Promise<void>;
}

export default function EdicaoEntregaScreen({
  onNavigate,
  onLogout,
  user,
  delivery,
  deliveries,
  comprovantesByDeliveryId,
  ocorrenciasByDeliveryId,
  onUpdateDelivery,
  onAddDelivery,
  onImportDeliveries,
  onSyncTracking,
  onUploadComprovante,
  onRemoveComprovante,
  onAddOcorrencia,
  onRemoveOcorrencia
}: EdicaoEntregaProps) {
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isComprovanteOpen, setIsComprovanteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [novoTipoOcorrencia, setNovoTipoOcorrencia] = useState<TipoOcorrencia | ''>('');
  const [novaDataOcorrencia, setNovaDataOcorrencia] = useState(() => new Date().toISOString().slice(0, 10));
  const [isRegistrandoOcorrencia, setIsRegistrandoOcorrencia] = useState(false);

  // Editable Form states (inicializados com fallback vazio; sincronizados abaixo quando `delivery` existe)
  // ENTREGUE sem nenhuma Data de Entrega é um estado inconsistente (pode ter
  // ficado salvo assim de antes desse ajuste) — corrige já na abertura da
  // tela, em vez de depender só da mudança ao vivo no campo de data. Mesma
  // ideia pra EM ROTA sem nenhuma Data de Expedição: a carga ainda nem foi
  // expedida, então o status correto é AGUARDANDO EXPEDIÇÃO.
  const [status, setStatus] = useState<DeliveryStatus>(
    delivery && delivery.status === 'ENTREGUE' && !delivery.dataEntrega ? 'EM ROTA' :
    delivery && delivery.status === 'EM ROTA' && !delivery.dataExpedicao ? 'AGUARDANDO EXPEDIÇÃO' :
    delivery?.status ?? 'EM ROTA'
  );
  const [ocorrencia, setOcorrencia] = useState(delivery?.ocorrencia ?? '');
  const [previsao, setPrevisao] = useState(delivery?.previsao ?? '');
  const [nfe, setNfe] = useState(formatNfe(delivery?.nfe));
  const [pedido, setPedido] = useState(delivery?.pedido ?? '');
  const [dataEntrega, setDataEntrega] = useState(delivery?.dataEntrega ?? '');
  const [nomeRecebedor, setNomeRecebedor] = useState(delivery?.nomeRecebedor ?? '');
  // '' = ainda não confirmado pelo operador nesta edição. Começa com o valor
  // já salvo (se o registro já estava fora do prazo e já foi confirmado
  // antes, mostra o que foi escolhido); só limpa de novo quando uma mudança
  // de data, aqui na tela, torna a entrega atrasada agora.
  const [atrasoResponsabilidade, setAtrasoResponsabilidade] = useState<AtrasoResponsabilidade | ''>(delivery?.atrasoResponsabilidade ?? '');
  const [remetente, setRemetente] = useState(delivery?.remetente ?? '');
  const [remetenteCnpj, setRemetenteCnpj] = useState(delivery?.remetenteCnpj ?? '');
  const [remetenteEndereco, setRemetenteEndereco] = useState(delivery?.remetenteEndereco ?? '');
  const [remetenteNumero, setRemetenteNumero] = useState(delivery?.remetenteNumero ?? '');
  const [remetenteComplemento, setRemetenteComplemento] = useState(delivery?.remetenteComplemento ?? '');
  const [remetenteBairro, setRemetenteBairro] = useState(delivery?.remetenteBairro ?? '');
  const [remetenteCep, setRemetenteCep] = useState(delivery?.remetenteCep ?? '');
  const [remetenteMunicipio, setRemetenteMunicipio] = useState(delivery?.remetenteMunicipio ?? '');
  const [remetenteUf, setRemetenteUf] = useState(delivery?.remetenteUf ?? '');
  const [cliente, setCliente] = useState(delivery?.cliente ?? '');
  const [razaoSocial, setRazaoSocial] = useState(delivery?.nomeRazaoSocial ?? '');
  const [cnpjCpf, setCnpjCpf] = useState(delivery?.cnpjCpf ?? '');
  const [dataPedido, setDataPedido] = useState(delivery?.dataPedido ?? '');
  const [dataExpedicao, setDataExpedicao] = useState(delivery?.dataExpedicao ?? '');
  const [endereco, setEndereco] = useState(delivery?.enderecoCompleto ?? '');
  const [numero, setNumero] = useState(delivery?.numero ?? '');
  const [complemento, setComplemento] = useState(delivery?.complemento ?? '');
  const [bairro, setBairro] = useState(delivery?.bairroDistrito ?? '');
  const [cep, setCep] = useState(delivery?.cep ?? '');
  const [municipio, setMunicipio] = useState(delivery?.municipio ?? '');
  const [uf, setUf] = useState(delivery?.uf ?? 'SP');
  const [foneFax, setFoneFax] = useState(delivery?.foneFax ?? '');
  const [valorCobranca, setValorCobranca] = useState(delivery?.valorCobranca ?? 0);
  const [valorPagamento, setValorPagamento] = useState(delivery?.valorPagamento ?? 0);
  const [melhorEnvioId, setMelhorEnvioId] = useState(delivery?.melhorEnvioId ?? '');
  const [motoristaId, setMotoristaId] = useState(delivery?.motoristaId ?? '');
  const [motoristas, setMotoristas] = useState<ProfileRecord[]>([]);

  useEffect(() => {
    fetchMotoristas()
      .then(setMotoristas)
      .catch((err) => console.error('Falha ao buscar motoristas:', err));
  }, []);

  // Se a sincronização descobrir o ID automaticamente (campo estava vazio),
  // reflete no campo assim que a entrega atualizada chegar de volta.
  useEffect(() => {
    if (delivery?.melhorEnvioId) setMelhorEnvioId(delivery.melhorEnvioId);
  }, [delivery?.melhorEnvioId]);

  // Mesma ideia pro valor pago ao operador: quando a sincronização traz o
  // "Preço do envio" real da Melhor Envio, reflete no campo.
  useEffect(() => {
    if (delivery?.valorPagamento != null) setValorPagamento(delivery.valorPagamento);
  }, [delivery?.valorPagamento]);

  if (!delivery) {
    return (
      <div className="p-8 text-center bg-surface min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-secondary font-medium">Nenhuma entrega selecionada para edição.</p>
        <button onClick={() => onNavigate('gestao-entregas')} className="px-4 py-2 bg-primary text-white rounded">
          Ir para Gerenciamento
        </button>
      </div>
    );
  }

  const deliveryComprovantes = comprovantesByDeliveryId.get(delivery.id) ?? [];
  const deliveryOcorrencias = [...(ocorrenciasByDeliveryId.get(delivery.id) ?? [])].sort((a, b) =>
    b.dataOcorrencia !== a.dataOcorrencia
      ? b.dataOcorrencia.localeCompare(a.dataOcorrencia)
      : b.createdAt.localeCompare(a.createdAt)
  );

  const handleCopyTrackingCode = () => {
    navigator.clipboard.writeText(delivery.codigoRastreio);
    alert(`Código de rastreamento ${delivery.codigoRastreio} copiado!`);
  };

  // Cada ocorrência registrada fica guardada com sua própria data — uma nova
  // não substitui as anteriores, ficam todas listadas (ver
  // supabase/migrations/024_ocorrencias_registradas.sql).
  const handleRegistrarOcorrencia = async () => {
    if (!novoTipoOcorrencia) {
      alert('Selecione o tipo de ocorrência.');
      return;
    }
    if (!novaDataOcorrencia) {
      alert('Informe a data da ocorrência.');
      return;
    }
    setIsRegistrandoOcorrencia(true);
    try {
      await onAddOcorrencia(delivery.id, novoTipoOcorrencia, novaDataOcorrencia);
      setNovoTipoOcorrencia('');
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível registrar a ocorrência: ${err.message}` : 'Não foi possível registrar a ocorrência.');
    } finally {
      setIsRegistrandoOcorrencia(false);
    }
  };

  const handleRemoverOcorrencia = async (id: string) => {
    if (!window.confirm('Remover esta ocorrência registrada?')) return;
    try {
      await onRemoveOcorrencia(id);
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível remover a ocorrência: ${err.message}` : 'Não foi possível remover a ocorrência.');
    }
  };

  const foraDoPrazo = (entrega: string, prev: string) => !!entrega && !!prev && entrega > prev;

  // Ao preencher a Data de Entrega, o status vira ENTREGUE sempre — a carga
  // foi entregue, independente de ter sido dentro ou fora do prazo. EM ATRASO
  // é reservado pra quem ainda está em rota (não muda aqui). A comparação com
  // a Previsão de Entrega vira um indicador de performance nos cards dos
  // dashboards (ver src/lib/deliveryStatus.ts), não o status em si. Limpar o
  // campo volta o status pra EM ROTA quando ele tinha sido setado como
  // ENTREGUE por essa mesma tela — sem isso, ficava "ENTREGUE" sem nenhuma
  // data de entrega, contando errado nos indicadores. Se o status foi
  // ajustado manualmente pra outra coisa (ex: FALHA), não mexe.
  const handleDataEntregaChange = (value: string) => {
    setDataEntrega(value);
    if (!value) {
      if (status === 'ENTREGUE') setStatus('EM ROTA');
      return;
    }
    if (foraDoPrazo(value, previsao)) setAtrasoResponsabilidade('');
    setStatus('ENTREGUE');
  };

  // Enquanto não há Data de Expedição, o status é AGUARDANDO EXPEDIÇÃO —
  // limpar o campo volta pra esse status (quando ele estava em EM ROTA por
  // essa mesma tela) e preencher tira desse status, liberando pra EM ROTA.
  // Se o status foi ajustado manualmente pra outra coisa (ex: FALHA), não mexe.
  const handleDataExpedicaoChange = (value: string) => {
    setDataExpedicao(value);
    if (!value) {
      if (status === 'EM ROTA') setStatus('AGUARDANDO EXPEDIÇÃO');
      return;
    }
    if (status === 'AGUARDANDO EXPEDIÇÃO') setStatus('EM ROTA');
  };

  // Editar a Previsão também pode tornar (ou deixar de tornar) a entrega
  // atrasada — mesma lógica de obrigar a reconfirmar quem é o responsável.
  const handlePrevisaoChange = (value: string) => {
    setPrevisao(value);
    if (foraDoPrazo(dataEntrega, value)) setAtrasoResponsabilidade('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (foraDoPrazo(dataEntrega, previsao) && !atrasoResponsabilidade) {
      alert('Selecione o Responsável pelo Atraso (Próprio ou Cliente) antes de salvar.');
      return;
    }
    setIsSaving(true);
    try {
      const motoristaNome = motoristaId ? motoristas.find((m) => m.id === motoristaId)?.name ?? '' : '';
      await onUpdateDelivery(delivery.id, {
        nfe,
        pedido,
        remetente,
        remetenteCnpj,
        remetenteEndereco,
        remetenteNumero,
        remetenteComplemento,
        remetenteBairro,
        remetenteCep,
        remetenteMunicipio,
        remetenteUf,
        status,
        ocorrencia,
        previsao,
        dataEntrega,
        nomeRecebedor,
        atrasoResponsabilidade: atrasoResponsabilidade || 'proprio',
        cliente,
        nomeRazaoSocial: razaoSocial,
        cnpjCpf,
        dataPedido,
        dataExpedicao,
        enderecoCompleto: endereco,
        numero,
        complemento,
        bairroDistrito: bairro,
        cep,
        municipio,
        uf,
        foneFax,
        valorCobranca,
        valorPagamento,
        melhorEnvioId,
        motoristaId: motoristaId || '',
        motoristaNome
      });
      alert('Informações atualizadas com sucesso!');
      onNavigate('gestao-entregas');
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível salvar: ${err.message}` : 'Não foi possível salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncTracking = async () => {
    setIsSyncing(true);
    try {
      const [result] = await onSyncTracking([delivery.id]);
      if (!result) {
        alert('Não foi possível sincronizar: nenhum resultado retornado.');
      } else if (!result.ok) {
        alert(`Não foi possível sincronizar: ${result.error ?? 'erro desconhecido'}`);
      } else {
        const parts: string[] = [];
        if (result.mappedStatus) parts.push(`status atualizado para "${result.mappedStatus}"`);
        else parts.push(`status "${result.rawStatus ?? '(vazio)'}" ainda não é reconhecido pelo sistema`);
        if (result.previsao) parts.push(`previsão de entrega: ${formatDateBR(result.previsao)}`);
        if (result.valorPagamento != null) parts.push(`pago operador: R$ ${result.valorPagamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        alert(`Rastreio consultado — ${parts.join('; ')}.`);
      }
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível sincronizar: ${err.message}` : 'Não foi possível sincronizar o rastreio.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">

      <Sidebar
        activePage="edicao-entrega"
        onNavigate={onNavigate}
        onNovaEntrega={() => setIsNewDeliveryOpen(true)}
        onImportar={() => setIsImportOpen(true)}
        onLogout={onLogout}
        onUsuarios={user.profileType === 'master' ? () => onNavigate('usuarios') : undefined}
        onIntegracoes={user.profileType === 'master' ? () => onNavigate('integracoes') : undefined}
        onCubagem={user.profileType === 'master' ? () => onNavigate('cubagem') : undefined}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <OperadorTopBar profile={user} />

        {/* Main Content Area */}
        <main className="flex-1 p-6 w-full max-w-7xl mx-auto overflow-hidden">

          {/* Navigation / Breadcrumb header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center text-on-surface-variant gap-2 text-xs mb-2">
                <button onClick={() => onNavigate('gestao-entregas')} className="hover:text-primary transition-colors">
                  Gerenciamento de Entregas
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-outline" />
                <span className="text-primary font-bold">Detalhamento da Carga</span>
              </div>
              <h1 className="font-headline text-3xl font-bold text-primary">Controle Detalhado da Carga</h1>
              <p className="text-sm text-secondary">Visualização completa e edição de ocorrências de entregas.</p>
            </div>

            <button
              onClick={() => onNavigate('gestao-entregas')}
              className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface-variant rounded-lg font-bold text-xs hover:bg-surface-container transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Lista</span>
            </button>
          </div>

          {/* Dynamic Edit Form Container */}
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Columns (2/3): Invoice Details */}
            <div className="lg:col-span-2 space-y-6">

              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 space-y-6">
                <h2 className="text-base font-bold text-primary pb-3 border-b border-outline-variant uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>Informações Principais da NF-e</span>
                </h2>

                {/* SECTION 1: REMETENTE */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-secondary tracking-widest uppercase">1. Remetente (contratante do frete)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Nome do Remetente</label>
                      <input
                        type="text"
                        required
                        value={remetente}
                        onChange={(e) => setRemetente(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">CNPJ do Remetente</label>
                      <input
                        type="text"
                        required
                        value={remetenteCnpj}
                        onChange={(e) => setRemetenteCnpj(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>

                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Precisa bater com o documento cadastrado na conta do cliente para ele conseguir ver esta entrega.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Endereço do Remetente</label>
                      <input
                        type="text"
                        value={remetenteEndereco}
                        onChange={(e) => setRemetenteEndereco(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Nº</label>
                      <input
                        type="text"
                        value={remetenteNumero}
                        onChange={(e) => setRemetenteNumero(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Complemento</label>
                      <input
                        type="text"
                        value={remetenteComplemento}
                        onChange={(e) => setRemetenteComplemento(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Bairro / Distrito</label>
                      <input
                        type="text"
                        value={remetenteBairro}
                        onChange={(e) => setRemetenteBairro(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">CEP</label>
                      <input
                        type="text"
                        value={remetenteCep}
                        onChange={(e) => setRemetenteCep(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Município</label>
                      <input
                        type="text"
                        value={remetenteMunicipio}
                        onChange={(e) => setRemetenteMunicipio(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">UF</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={remetenteUf}
                        onChange={(e) => setRemetenteUf(e.target.value.toUpperCase())}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-bold uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: DADOS DE EMISSÃO */}
                <div className="space-y-4 pt-4 border-t border-outline-variant/30">
                  <h3 className="text-xs font-bold text-secondary tracking-widest uppercase">2. Dados de Emissão</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Data do Pedido</label>
                      <input
                        type="date"
                        value={dataPedido}
                        onChange={(e) => setDataPedido(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Nº NF-e</label>
                      <input
                        type="text"
                        value={nfe}
                        onChange={(e) => setNfe(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Pedido</label>
                      <input
                        type="text"
                        value={pedido}
                        onChange={(e) => setPedido(e.target.value)}
                        placeholder="Referência do pedido"
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Data de Expedição</label>
                      <input
                        type="date"
                        value={dataExpedicao}
                        onChange={(e) => handleDataExpedicaoChange(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                  </div>
                </div>

                {/* SECTION 3: DESTINATÁRIO */}
                <div className="space-y-4 pt-4 border-t border-outline-variant/30">
                  <h3 className="text-xs font-bold text-secondary tracking-widest uppercase">3. Destinatário</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Nome do Cliente (Apelido)</label>
                      <input
                        type="text"
                        value={cliente}
                        onChange={(e) => setCliente(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Razão Social Completa</label>
                      <input
                        type="text"
                        value={razaoSocial}
                        onChange={(e) => setRazaoSocial(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs text-on-surface-variant font-medium">CNPJ / CPF</label>
                      <input
                        type="text"
                        value={cnpjCpf}
                        onChange={(e) => setCnpjCpf(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>

                  </div>
                </div>

                {/* SECTION 4: ENDEREÇO DE ENTREGA */}
                <div className="space-y-4 pt-4 border-t border-outline-variant/30">
                  <h3 className="text-xs font-bold text-secondary tracking-widest uppercase flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-secondary" />
                    <span>4. Endereço de Entrega</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Endereço Completo</label>
                      <input
                        type="text"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Nº</label>
                      <input
                        type="text"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Complemento</label>
                      <input
                        type="text"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Bairro / Distrito</label>
                      <input
                        type="text"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">CEP</label>
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">Município</label>
                      <input
                        type="text"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-medium">UF</label>
                      <select
                        value={uf}
                        onChange={(e) => setUf(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer font-bold"
                      >
                        <option value="SP">SP</option>
                        <option value="RJ">RJ</option>
                        <option value="MG">MG</option>
                        <option value="PR">PR</option>
                        <option value="SC">SC</option>
                        <option value="RS">RS</option>
                        <option value="AM">AM</option>
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-3">
                      <label className="text-xs text-on-surface-variant font-medium">Fone / Fax</label>
                      <input
                        type="text"
                        value={foneFax}
                        onChange={(e) => setFoneFax(e.target.value)}
                        className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>

                  </div>
                </div>

              </div>

            </div>

            {/* Right Column (1/3): Logistics controller updates */}
            <div className="space-y-6">

              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 space-y-5">
                <h2 className="text-base font-bold text-primary pb-3 border-b border-outline-variant uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-primary" />
                  <span>Controle Logístico</span>
                </h2>

                {/* Status Update Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Status Atual da Carga</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
                    className={`w-full p-3 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                      status === 'ENTREGUE' ? 'border-green-300 bg-green-50 text-green-800' :
                      status === 'EM ROTA' ? 'border-blue-300 bg-blue-50 text-blue-800' :
                      status === 'EM ATRASO' ? 'border-amber-300 bg-amber-50 text-amber-800' :
                      status === 'DEVOLVIDO' ? 'border-gray-300 bg-gray-50 text-gray-800' :
                      status === 'AGUARDANDO EXPEDIÇÃO' ? 'border-purple-300 bg-purple-50 text-purple-800' :
                      'border-red-300 bg-red-50 text-red-800'
                    }`}
                  >
                    <option value="AGUARDANDO EXPEDIÇÃO">🕐 AGUARDANDO EXPEDIÇÃO</option>
                    <option value="ENTREGUE">✓ ENTREGUE</option>
                    <option value="EM ROTA">🚚 EM ROTA</option>
                    <option value="EM ATRASO">⚠️ EM ATRASO</option>
                    <option value="FALHA">🛑 FALHA</option>
                    <option value="DEVOLVIDO">↩️ DEVOLVIDO</option>
                  </select>
                </div>

                {/* Registro de ocorrências tipificadas (com data), acumulativo */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Registrar Ocorrência</label>
                  <select
                    value={novoTipoOcorrencia}
                    onChange={(e) => setNovoTipoOcorrencia(e.target.value as TipoOcorrencia | '')}
                    className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
                  >
                    <option value="">Selecione a ocorrência...</option>
                    {TIPOS_OCORRENCIA.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={novaDataOcorrencia}
                    onChange={(e) => setNovaDataOcorrencia(e.target.value)}
                    className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleRegistrarOcorrencia}
                    disabled={isRegistrandoOcorrencia}
                    className="w-full flex items-center justify-center gap-1 py-2.5 px-4 bg-secondary-container text-secondary rounded-lg text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Registrar</span>
                  </button>

                  {deliveryOcorrencias.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {deliveryOcorrencias.map((oc) => (
                        <li
                          key={oc.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="font-bold text-amber-800 truncate">{oc.tipo}</span>
                            <span className="text-amber-700 shrink-0">{formatDateBR(oc.dataOcorrencia)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoverOcorrencia(oc.id)}
                            title="Remover ocorrência"
                            className="text-amber-600 hover:text-error shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Free-text notes field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Observações</label>
                  <textarea
                    rows={3}
                    value={ocorrencia}
                    onChange={(e) => setOcorrencia(e.target.value)}
                    placeholder="Ex: Objeto em trânsito entre Centros de Distribuição"
                    className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  ></textarea>
                </div>

                {/* Estimated Delivery update */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Previsão de Entrega</label>
                  <input
                    type="date"
                    value={previsao}
                    onChange={(e) => handlePrevisaoChange(e.target.value)}
                    className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                {/* Actual Delivery Date */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Data de Entrega</label>
                    <button
                      type="button"
                      onClick={() => setIsComprovanteOpen(true)}
                      className={`flex items-center gap-1 text-[11px] font-bold hover:underline ${deliveryComprovantes.length > 0 ? 'text-secondary' : 'text-on-surface-variant'}`}
                      title={deliveryComprovantes.length > 0 ? `${deliveryComprovantes.length} comprovante(s) anexado(s)` : 'Anexar comprovante de entrega'}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      {deliveryComprovantes.length > 0 ? 'Comprovante anexado' : 'Anexar comprovante'}
                    </button>
                  </div>
                  <input
                    type="date"
                    value={dataEntrega}
                    onChange={(e) => handleDataEntregaChange(e.target.value)}
                    className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                {/* Motorista responsável pela entrega */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Motorista Responsável</label>
                  <select
                    value={motoristaId}
                    onChange={(e) => setMotoristaId(e.target.value)}
                    className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
                  >
                    <option value="">Não atribuído</option>
                    {motoristas.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Recipient name (who signed for the delivery) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Nome Recebedor</label>
                  <input
                    type="text"
                    value={nomeRecebedor}
                    onChange={(e) => setNomeRecebedor(e.target.value)}
                    placeholder="Nome de quem recebeu a entrega"
                    className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                {/* Responsável por um eventual atraso — só faz sentido perguntar quando
                    a entrega realmente saiu do prazo. Quando é do cliente, não conta
                    contra os indicadores de performance de prazo. */}
                {foraDoPrazo(dataEntrega, previsao) && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Responsável pelo Atraso</label>
                    <select
                      value={atrasoResponsabilidade}
                      onChange={(e) => setAtrasoResponsabilidade(e.target.value as AtrasoResponsabilidade)}
                      required
                      className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-medium cursor-pointer"
                    >
                      <option value="" disabled>SELECIONE...</option>
                      <option value="proprio">PRÓPRIO</option>
                      <option value="cliente">CLIENTE</option>
                    </select>
                  </div>
                )}

                {/* Tracking Code (Read-Only Copyable field) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Código de Rastreamento</label>
                  <div className="flex rounded-lg overflow-hidden border border-outline-variant bg-surface">
                    <span className="p-3 font-mono text-xs text-primary font-bold flex-1 truncate select-all">
                      {delivery.codigoRastreio}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyTrackingCode}
                      className="px-3 bg-surface-container border-l border-outline-variant hover:bg-secondary-container transition-colors text-secondary"
                      title="Copiar Código"
                    >
                      <ClipboardCopy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Melhor Envio tracking sync */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">ID Melhor Envio</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={melhorEnvioId}
                      onChange={(e) => setMelhorEnvioId(e.target.value)}
                      placeholder="Deixe em branco pra buscar automaticamente pela NF-e"
                      className="flex-1 p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSyncTracking}
                      disabled={isSyncing}
                      title="Atualizar rastreio (busca o ID automaticamente pela NF-e, se estiver vazio)"
                      className="px-3 bg-surface-container border border-outline-variant rounded-lg hover:bg-secondary-container transition-colors text-secondary disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {delivery.melhorEnvioLastSyncAt && (
                    <p className="text-[10px] text-on-surface-variant">
                      Última sincronização: {new Date(delivery.melhorEnvioLastSyncAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                {/* Finance specs */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/30">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-secondary uppercase block">Valor Cobrança</span>
                    <input
                      type="number"
                      value={valorCobranca}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setValorCobranca(val);
                        setValorPagamento(val * 0.65); // automatic helper proportion
                      }}
                      className="w-full p-2 bg-surface border border-outline-variant rounded-lg text-xs font-mono font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-secondary uppercase block">Pago Operador</span>
                    <input
                      type="number"
                      value={valorPagamento}
                      onChange={(e) => setValorPagamento(Number(e.target.value))}
                      className="w-full p-2 bg-surface border border-outline-variant rounded-lg text-xs font-mono font-bold text-secondary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Action Trigger Buttons */}
                <div className="space-y-2 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:opacity-95 transition-all shadow-md text-sm disabled:opacity-75"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('gestao-entregas')}
                    className="w-full border border-outline text-secondary py-3 px-4 rounded-xl flex items-center justify-center font-bold hover:bg-surface-container transition-all text-sm"
                  >
                    Cancelar
                  </button>
                </div>

              </div>

            </div>

          </form>

        </main>
      </div>

      <MobileBottomNav activePage="edicao-entrega" onNavigate={onNavigate} onImportar={() => setIsImportOpen(true)} />

      <NovaEntregaModal
        open={isNewDeliveryOpen}
        onClose={() => setIsNewDeliveryOpen(false)}
        onCreate={onAddDelivery}
      />

      <ImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={onImportDeliveries}
        existingDeliveries={deliveries}
      />

      <ComprovanteModal
        delivery={isComprovanteOpen ? delivery : null}
        comprovantes={deliveryComprovantes}
        onClose={() => setIsComprovanteOpen(false)}
        onUpload={onUploadComprovante}
        onRemove={onRemoveComprovante}
      />

    </div>
  );
}
