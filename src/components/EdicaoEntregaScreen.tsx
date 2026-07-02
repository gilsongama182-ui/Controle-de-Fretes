import React, { useState } from 'react';
import {
  ChevronRight, Calendar, Landmark, MapPin, Save, ArrowLeft, ClipboardCopy
} from 'lucide-react';
import { ActivePage, Delivery, DeliveryStatus, User } from '../types';
import { NewDeliveryInput } from '../lib/deliveries';
import { formatNfe } from '../lib/formatNfe';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import MobileBottomNav from './layout/MobileBottomNav';
import NovaEntregaModal from './layout/NovaEntregaModal';
import ImportModal from './layout/ImportModal';

interface EdicaoEntregaProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  delivery: Delivery | null;
  onUpdateDelivery: (id: string, patch: Partial<Delivery>) => Promise<void>;
  onAddDelivery: (input: NewDeliveryInput) => Promise<void>;
  onImportDelivery: (input: NewDeliveryInput) => Promise<void>;
}

export default function EdicaoEntregaScreen({
  onNavigate,
  onLogout,
  user,
  delivery,
  onUpdateDelivery,
  onAddDelivery,
  onImportDelivery
}: EdicaoEntregaProps) {
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable Form states (inicializados com fallback vazio; sincronizados abaixo quando `delivery` existe)
  const [status, setStatus] = useState<DeliveryStatus>(delivery?.status ?? 'EM ROTA');
  const [ocorrencia, setOcorrencia] = useState(delivery?.ocorrencia ?? '');
  const [previsao, setPrevisao] = useState(delivery?.previsao ?? '');
  const [nfe, setNfe] = useState(formatNfe(delivery?.nfe));
  const [dataEntrega, setDataEntrega] = useState(delivery?.dataEntrega ?? '');
  const [remetente, setRemetente] = useState(delivery?.remetente ?? '');
  const [remetenteCnpj, setRemetenteCnpj] = useState(delivery?.remetenteCnpj ?? '');
  const [cliente, setCliente] = useState(delivery?.cliente ?? '');
  const [razaoSocial, setRazaoSocial] = useState(delivery?.nomeRazaoSocial ?? '');
  const [cnpjCpf, setCnpjCpf] = useState(delivery?.cnpjCpf ?? '');
  const [dataPedido, setDataPedido] = useState(delivery?.dataPedido ?? '');
  const [dataExpedicao, setDataExpedicao] = useState(delivery?.dataExpedicao ?? '');
  const [endereco, setEndereco] = useState(delivery?.enderecoCompleto ?? '');
  const [bairro, setBairro] = useState(delivery?.bairroDistrito ?? '');
  const [cep, setCep] = useState(delivery?.cep ?? '');
  const [municipio, setMunicipio] = useState(delivery?.municipio ?? '');
  const [uf, setUf] = useState(delivery?.uf ?? 'SP');
  const [foneFax, setFoneFax] = useState(delivery?.foneFax ?? '');
  const [valorCobranca, setValorCobranca] = useState(delivery?.valorCobranca ?? 0);
  const [valorPagamento, setValorPagamento] = useState(delivery?.valorPagamento ?? 0);

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

  const handleCopyTrackingCode = () => {
    navigator.clipboard.writeText(delivery.codigoRastreio);
    alert(`Código de rastreamento ${delivery.codigoRastreio} copiado!`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateDelivery(delivery.id, {
        nfe,
        remetente,
        remetenteCnpj,
        status,
        ocorrencia,
        previsao,
        dataEntrega,
        cliente,
        nomeRazaoSocial: razaoSocial,
        cnpjCpf,
        dataPedido,
        dataExpedicao,
        enderecoCompleto: endereco,
        bairroDistrito: bairro,
        cep,
        municipio,
        uf,
        foneFax,
        valorCobranca,
        valorPagamento
      });
      alert('Informações atualizadas com sucesso!');
      onNavigate('gestao-entregas');
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível salvar: ${err.message}` : 'Não foi possível salvar as alterações.');
    } finally {
      setIsSaving(false);
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
                </div>

                {/* SECTION 2: DADOS DE EMISSÃO */}
                <div className="space-y-4 pt-4 border-t border-outline-variant/30">
                  <h3 className="text-xs font-bold text-secondary tracking-widest uppercase">2. Dados de Emissão</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

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
                      <label className="text-xs text-on-surface-variant font-medium">Data de Expedição</label>
                      <input
                        type="date"
                        value={dataExpedicao}
                        onChange={(e) => setDataExpedicao(e.target.value)}
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

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs text-on-surface-variant font-medium">Endereço Completo</label>
                      <input
                        type="text"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
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
                      'border-red-300 bg-red-50 text-red-800'
                    }`}
                  >
                    <option value="ENTREGUE">✓ ENTREGUE</option>
                    <option value="EM ROTA">🚚 EM ROTA</option>
                    <option value="EM ATRASO">⚠️ EM ATRASO</option>
                    <option value="FALHA">🛑 FALHA</option>
                  </select>
                </div>

                {/* Log occurrence input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Última Ocorrência</label>
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
                    type="text"
                    value={previsao}
                    onChange={(e) => setPrevisao(e.target.value)}
                    placeholder="Hoje, 18:00"
                    className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                {/* Actual Delivery Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Data de Entrega</label>
                  <input
                    type="date"
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
                    className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

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
        onImport={onImportDelivery}
      />

    </div>
  );
}
