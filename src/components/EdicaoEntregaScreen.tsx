import React, { useState } from 'react';
import { 
  LayoutDashboard, Truck, Users, FileUp, Settings, LogOut,
  ChevronRight, Calendar, Landmark, MapPin, CheckCircle, Save, ArrowLeft, ClipboardCopy 
} from 'lucide-react';
import { ActivePage, Delivery, DeliveryStatus, User } from '../types';

interface EdicaoEntregaProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  delivery: Delivery | null;
  onUpdateDelivery: (delivery: Delivery) => void;
}

export default function EdicaoEntregaScreen({
  onNavigate,
  onLogout,
  user,
  delivery,
  onUpdateDelivery
}: EdicaoEntregaProps) {
  if (!delivery) {
    return (
      <div className="p-8 text-center bg-surface">
        <p className="text-sm text-secondary font-medium">Nenhuma entrega selecionada para edição.</p>
        <button onClick={() => onNavigate('gestao-entregas')} className="mt-4 px-4 py-2 bg-primary text-white rounded">
          Ir para Gerenciamento
        </button>
      </div>
    );
  }

  // Editable Form states
  const [status, setStatus] = useState<DeliveryStatus>(delivery.status);
  const [ocorrencia, setOcorrencia] = useState(delivery.ocorrencia || '');
  const [previsao, setPrevisao] = useState(delivery.previsao || '');
  
  // Non-editable or editable metadata fields
  const [nfe, setNfe] = useState(delivery.nfe);
  const [cliente, setCliente] = useState(delivery.cliente);
  const [razaoSocial, setRazaoSocial] = useState(delivery.nomeRazaoSocial);
  const [cnpjCpf, setCnpjCpf] = useState(delivery.cnpjCpf);
  const [dataPedido, setDataPedido] = useState(delivery.dataPedido);
  const [dataExpedicao, setDataExpedicao] = useState(delivery.dataExpedicao);
  
  // Address fields
  const [endereco, setEndereco] = useState(delivery.enderecoCompleto);
  const [bairro, setBairro] = useState(delivery.bairroDistrito);
  const [cep, setCep] = useState(delivery.cep);
  const [municipio, setMunicipio] = useState(delivery.municipio);
  const [uf, setUf] = useState(delivery.uf);
  const [foneFax, setFoneFax] = useState(delivery.foneFax);

  // Financial fields
  const [valorCobranca, setValorCobranca] = useState(delivery.valorCobranca);
  const [valorPagamento, setValorPagamento] = useState(delivery.valorPagamento);

  const handleCopyTrackingCode = () => {
    navigator.clipboard.writeText(delivery.codigoRastreio);
    alert(`Código de rastreamento ${delivery.codigoRastreio} copiado!`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updated: Delivery = {
      ...delivery,
      status,
      ocorrencia,
      previsao,
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
    };

    onUpdateDelivery(updated);
    alert('Informações atualizadas com sucesso!');
    onNavigate('gestao-entregas');
  };

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-[280px] bg-surface-container-low border-r border-outline-variant flex flex-col py-6 px-4 shrink-0 md:sticky md:top-0 md:h-screen">
        <div className="px-3 mb-8">
          <h1 className="font-headline text-2xl font-bold text-primary">Logística</h1>
          <p className="text-xs text-on-surface-variant font-semibold tracking-wider uppercase opacity-70">
            Painel de Operações
          </p>
        </div>

        <nav className="flex-grow space-y-1">
          <button
            onClick={() => onNavigate('dashboard-operador')}
            className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/40 rounded-lg text-left text-sm transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('gestao-entregas')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-left text-sm"
          >
            <Truck className="w-5 h-5" />
            <span>Gerenciamento</span>
          </button>

          <button
            onClick={() => alert('Filtro de usuários logísticos simulado.')}
            className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/40 rounded-lg text-left text-sm transition-colors"
          >
            <Users className="w-5 h-5" />
            <span>Usuários</span>
          </button>

          <button
            onClick={() => alert('Aba de importação de arquivos excel.')}
            className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/40 rounded-lg text-left text-sm transition-colors"
          >
            <FileUp className="w-5 h-5" />
            <span>Importação</span>
          </button>
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant">
          <button
            onClick={() => alert('Configurações do sistema de logística.')}
            className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-variant/40 rounded-lg text-left text-xs transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </button>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-error hover:bg-error-container/20 rounded-lg text-left text-xs transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

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

              {/* SECTION 1: DADOS DE EMISSÃO */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-secondary tracking-widest uppercase">1. Dados de Emissão</h3>
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

              {/* SECTION 2: DESTINATÁRIO */}
              <div className="space-y-4 pt-4 border-t border-outline-variant/30">
                <h3 className="text-xs font-bold text-secondary tracking-widest uppercase">2. Destinatário</h3>
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

              {/* SECTION 3: ENDEREÇO DE ENTREGA */}
              <div className="space-y-4 pt-4 border-t border-outline-variant/30">
                <h3 className="text-xs font-bold text-secondary tracking-widest uppercase flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-secondary" />
                  <span>3. Endereço de Entrega</span>
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
                  onChange={(e) => {
                    const nextVal = e.target.value as DeliveryStatus;
                    setStatus(nextVal);
                  }}
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
                  className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:opacity-95 transition-all shadow-md text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
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
  );
}
