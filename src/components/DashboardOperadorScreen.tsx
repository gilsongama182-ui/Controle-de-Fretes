import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Truck, Users, FileUp, PlusCircle, Settings, LogOut, 
  Search, Bell, Download, CheckCircle, Clock, AlertTriangle, ChevronRight, X 
} from 'lucide-react';
import { ActivePage, Delivery, User } from '../types';

interface DashboardOperadorProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  deliveries: Delivery[];
  onAddDelivery: (delivery: Delivery) => void;
  onSelectDeliveryForEdit: (delivery: Delivery) => void;
}

export default function DashboardOperadorScreen({
  onNavigate,
  onLogout,
  user,
  deliveries,
  onAddDelivery,
  onSelectDeliveryForEdit
}: DashboardOperadorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // New Delivery Form State
  const [nfe, setNfe] = useState('');
  const [cliente, setCliente] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');
  const [valor, setValor] = useState('');
  const [endereco, setEndereco] = useState('');

  // Computed metrics based on the shared deliveries array
  const metrics = useMemo(() => {
    const total = deliveries.length + 1274; // keep base similar to mockup
    const deliveredCount = deliveries.filter(d => d.status === 'ENTREGUE').length;
    const enRouteCount = deliveries.filter(d => d.status === 'EM ROTA').length;
    const delayedCount = deliveries.filter(d => d.status === 'EM ATRASO').length;
    const failureCount = deliveries.filter(d => d.status === 'FALHA').length;

    // Proportions
    const pctDelivered = ((deliveredCount / deliveries.length) * 100).toFixed(1);
    const pctEnRoute = ((enRouteCount / deliveries.length) * 100).toFixed(1);
    const pctDelayed = ((delayedCount / deliveries.length) * 100).toFixed(1);

    return {
      total,
      pctDelivered: isNaN(Number(pctDelivered)) ? '85.4%' : `${pctDelivered}%`,
      pctEnRoute: isNaN(Number(pctEnRoute)) ? '12.2%' : `${pctEnRoute}%`,
      pctDelayed: isNaN(Number(pctDelayed)) ? '2.4%' : `${pctDelayed}%`,
    };
  }, [deliveries]);

  // Filter deliveries based on search
  const filteredDeliveries = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return deliveries.slice(0, 5); // display top 5 on dashboard
    return deliveries.filter(d => 
      d.id.toLowerCase().includes(term) ||
      d.cliente.toLowerCase().includes(term) ||
      d.nfe.toLowerCase().includes(term) ||
      d.municipio.toLowerCase().includes(term)
    );
  }, [deliveries, searchTerm]);

  const handleCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfe || !cliente) {
      alert('Por favor, preencha a NF-e e o Nome do Cliente.');
      return;
    }

    const randomIdNumber = Math.floor(1000 + Math.random() * 9000);
    const newDel: Delivery = {
      id: `#HM-${randomIdNumber}`,
      nfe,
      cliente,
      nomeRazaoSocial: razaoSocial || `${cliente} S.A.`,
      cnpjCpf: cnpjCpf || '00.000.000/0001-00',
      dataPedido: new Date().toISOString().split('T')[0],
      dataExpedicao: new Date().toISOString().split('T')[0],
      previsao: 'Hoje, 18:00',
      enderecoCompleto: endereco || 'Rua das Logísticas, 1000',
      bairroDistrito: 'Distrito Industrial',
      cep: '04500-100',
      municipio: cidade || 'São Paulo',
      uf: uf,
      foneFax: '(11) 99999-8888',
      status: 'EM ROTA',
      ocorrencia: 'Nenhuma',
      valorCobranca: Number(valor) || 1200.00,
      valorPagamento: (Number(valor) || 1200) * 0.65,
      codigoRastreio: `HB2024TX${randomIdNumber}`
    };

    onAddDelivery(newDel);
    setIsNewDeliveryOpen(false);
    
    // Reset fields
    setNfe('');
    setCliente('');
    setRazaoSocial('');
    setCnpjCpf('');
    setCidade('');
    setUf('SP');
    setValor('');
    setEndereco('');
  };

  // Simulate spreadsheet import
  const [dragActive, setDragActive] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateImport();
    }
  };

  const simulateImport = () => {
    setImportSuccess(true);
    setTimeout(() => {
      // Add a couple of mock imported items
      const item1: Delivery = {
        id: "#HM-9245",
        nfe: "112.985-10",
        cliente: "Importado Sul Ltda",
        nomeRazaoSocial: "Importadora Sul Brasileira LTDA",
        cnpjCpf: "12.000.111/0001-22",
        dataPedido: "2024-10-18",
        dataExpedicao: "2024-10-19",
        previsao: "2024-10-22",
        enderecoCompleto: "Av. Beira Rio, 99",
        bairroDistrito: "Porto",
        cep: "90000-000",
        municipio: "Porto Alegre",
        uf: "RS",
        foneFax: "(51) 3222-1111",
        status: "EM ROTA",
        ocorrencia: "Importado via planilha",
        valorCobranca: 2500.00,
        valorPagamento: 1600.00,
        codigoRastreio: "HB2024TX945"
      };
      onAddDelivery(item1);
      setImportSuccess(false);
      setIsImportOpen(false);
      alert('Planilha importada com sucesso! 1 nova entrega adicionada.');
    }, 1500);
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

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => onNavigate('dashboard-operador')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-left text-sm"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('gestao-entregas')}
            className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/40 rounded-lg text-left text-sm transition-colors"
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
            onClick={() => setIsImportOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-variant/40 rounded-lg text-left text-sm transition-colors"
          >
            <FileUp className="w-5 h-5" />
            <span>Importação</span>
          </button>
        </nav>

        <div className="px-2 mb-6">
          <button
            onClick={() => setIsNewDeliveryOpen(true)}
            className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:brightness-110 transition-all shadow-md text-sm"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Nova Entrega</span>
          </button>
        </div>

        <div className="border-t border-outline-variant pt-4 space-y-1">
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
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TopAppBar */}
        <header className="sticky top-0 z-30 flex justify-between items-center w-full px-6 h-16 bg-surface border-b border-outline-variant">
          <div className="flex items-center gap-4">
            <h2 className="font-headline text-lg font-bold text-primary truncate">
              Acompanhamento Entregas Hemmersbach
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="hidden lg:flex items-center bg-surface-container rounded-full px-4 py-1.5 border border-outline-variant">
              <Search className="w-4 h-4 text-outline" />
              <input
                type="text"
                placeholder="Buscar entrega..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs w-48 ml-2 outline-none"
              />
            </div>

            {/* Notifications button */}
            <button 
              onClick={() => alert('Você possui 2 novas notificações de ocorrências logísticas.')}
              className="p-2 text-secondary hover:bg-secondary-container/50 rounded-full transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
            </button>

            <div className="h-8 w-px bg-outline-variant"></div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-primary">{user.name}</p>
                <p className="text-[9px] text-secondary font-semibold tracking-wider">UNIDADE SÃO PAULO</p>
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
                <img
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAz0rWKkQNtnmB0U1opX2Yx7LsuXpYZnjNyQ7CbTkcXaa7fGUuYLdc3F_tEs56-J140PKcjxE1NP9TiAYaEdyOENmStJvTS5S-Ot0lg4Vn5hhvkgLLZENKc2mCTUtP-_QDyBS3jj7cz6sdoEhW6K2c0YTvKAtixejeV-ya4xCIxw9tj433V0cxU2C6L3ElD1Rn1Y4J-7E1ISnYLQ7QoCT6FXFSGcBA4IG1F_x-uPFLVYSXUAN-x7kAo7w"
                  alt="Operador Hemmersbach profile"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 space-y-6 flex-1">
          
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="font-headline text-2xl font-bold text-primary">Painel de Controle Geral</h3>
              <p className="text-sm text-secondary">Monitoramento em tempo real das operações de transporte.</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => alert('Relatório consolidado exportado com sucesso.')}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-bold text-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Relatório</span>
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:brightness-110 transition-all font-bold text-sm shadow-md"
              >
                <FileUp className="w-4 h-4" />
                <span>Importar Planilha</span>
              </button>
            </div>
          </div>

          {/* KPI Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* 1. Total Entregas */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Total de Entregas</span>
                <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                  <Truck className="text-primary w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-primary">{metrics.total}</h4>
                <div className="flex items-center gap-1 text-on-tertiary-container text-xs font-bold mt-1">
                  <span>+12% vs ontem</span>
                </div>
              </div>
            </div>

            {/* 2. % Entregue */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-on-tertiary-container flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">% Entregue</span>
                <div className="w-8 h-8 rounded-lg bg-tertiary-container/10 flex items-center justify-center">
                  <CheckCircle className="text-on-tertiary-container w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-primary">{metrics.pctDelivered}</h4>
                <p className="text-xs text-secondary mt-1">Meta: 90%</p>
              </div>
            </div>

            {/* 3. % Em Rota */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-secondary flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">% Em Rota</span>
                <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center">
                  <Truck className="text-on-secondary-container w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-primary">{metrics.pctEnRoute}</h4>
                <p className="text-xs text-secondary mt-1">156 veículos ativos</p>
              </div>
            </div>

            {/* 4. % No Prazo */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-primary flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Dentro do Prazo</span>
                <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                  <Clock className="text-primary w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-primary">94.8%</h4>
                <div className="w-full bg-surface-container rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '94.8%' }}></div>
                </div>
              </div>
            </div>

            {/* 5. % Fora do Prazo */}
            <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-error flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase">Fora do Prazo</span>
                <div className="w-8 h-8 rounded-lg bg-error-container/20 flex items-center justify-center">
                  <AlertTriangle className="text-error w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-headline text-3xl font-bold text-error">5.2%</h4>
                <div className="flex items-center gap-1 text-error text-xs font-bold mt-1">
                  <span>-2% v.m.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Dashboard Body divided into columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 columns: Recent Deliveries table */}
            <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-5 flex justify-between items-center border-b border-outline-variant">
                <h4 className="font-headline text-lg font-bold text-primary">Entregas Recentes</h4>
                <button 
                  onClick={() => onNavigate('gestao-entregas')}
                  className="text-primary font-bold text-sm hover:underline"
                >
                  Ver tudo
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container border-b border-outline-variant">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">Nº PEDIDO</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">CLIENTE</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">CIDADE/UF</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">STATUS</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-secondary">PREVISÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredDeliveries.map((del) => (
                      <tr 
                        key={del.id}
                        onClick={() => onSelectDeliveryForEdit(del)}
                        className="hover:bg-primary/5 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-4 font-mono text-sm text-primary font-semibold">{del.id}</td>
                        <td className="px-5 py-4 font-semibold text-sm text-on-surface">{del.cliente}</td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant">{del.municipio}, {del.uf}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            del.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' :
                            del.status === 'EM ROTA' ? 'bg-blue-100 text-blue-800' :
                            del.status === 'EM ATRASO' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {del.status === 'EM ATRASO' ? 'EM ATRASO' : del.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant font-medium">{del.previsao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right column: Widgets */}
            <div className="space-y-6">
              
              {/* Delivery Efficiency Bar Chart */}
              <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
                <h4 className="font-headline text-lg font-bold text-primary mb-4">Eficiência de Entrega</h4>
                <div className="h-44 w-full flex items-end justify-between gap-3 px-2 pt-4">
                  
                  {/* SEG bar */}
                  <div className="w-full bg-primary/20 rounded-t-lg relative group transition-all" style={{ height: '60%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">SEG</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">SEG</span>
                  </div>

                  {/* TER bar */}
                  <div className="w-full bg-primary/40 rounded-t-lg relative group transition-all" style={{ height: '75%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">TER</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">TER</span>
                  </div>

                  {/* QUA bar */}
                  <div className="w-full bg-primary/30 rounded-t-lg relative group transition-all" style={{ height: '65%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">QUA</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">QUA</span>
                  </div>

                  {/* QUI bar */}
                  <div className="w-full bg-primary rounded-t-lg relative group transition-all" style={{ height: '90%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">QUI</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">QUI</span>
                  </div>

                  {/* SEX bar */}
                  <div className="w-full bg-primary/50 rounded-t-lg relative group transition-all" style={{ height: '80%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">SEX</div>
                    <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary">SEX</span>
                  </div>

                </div>

                <div className="mt-10 space-y-2 border-t border-outline-variant/30 pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-secondary">Média Semanal</span>
                    <span className="font-bold text-primary">78%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-secondary">Destaque</span>
                    <span className="font-bold text-on-tertiary-container">Quinta-feira (+15%)</span>
                  </div>
                </div>
              </div>

              {/* Map summary overlay widget */}
              <div className="relative overflow-hidden rounded-xl border border-outline-variant h-64 shadow-sm group">
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDvMrRbhNEbTGMaQHtieGaWPfrhO92Mea7Xmfl96paanePzS12SLX_rWLuUrxhvUohzkzYXx0yp-kWGzONZOnrCDOq9I2YgXUr6gmJn-xD8vKdEM0RrLitBby-kpaEqNmnD2NdTv4XEjRoYRSBFpjQQEIkOO2iqilRiTaetTASTDObEpTbxruwUga8_X9ThUbIzY0Cbb-ldzNFe2xa6Me1Yo5x6IETa7EcRITyS9bNGSbgG5n4Dmx_Y-Q')" }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent z-10"></div>
                <div className="absolute bottom-0 left-0 p-6 z-20 text-white w-full">
                  <h5 className="font-headline text-lg font-bold">Cobertura Nacional</h5>
                  <p className="text-xs opacity-90 mb-3">14 Centros de Distribuição ativos</p>
                  <button 
                    onClick={() => alert('Visualizador de Mapa Operacional Interativo em desenvolvimento.')}
                    className="w-full bg-white text-primary py-2 rounded-lg font-bold text-sm hover:bg-surface transition-colors"
                  >
                    Abrir Mapa Operacional
                  </button>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* Footer Area */}
        <footer className="w-full py-4 px-6 bg-surface-container-highest border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-2 mt-auto text-xs text-on-surface-variant">
          <div>
            © 2024 Hemmersbach Logistics - Suporte:{' '}
            <a className="font-bold hover:text-primary" href="mailto:suporte@hemmersbach.com">
              suporte@hemmersbach.com
            </a>
          </div>
          <div className="flex gap-4">
            <a className="hover:text-primary hover:underline" href="#privacy">Política de Privacidade</a>
            <a className="hover:text-primary hover:underline" href="#terms">Termos de Uso</a>
            <a className="hover:text-primary hover:underline" href="#faq">FAQ</a>
          </div>
        </footer>

      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-outline-variant flex justify-around py-2.5 px-2 z-40">
        <button onClick={() => onNavigate('dashboard-operador')} className="flex flex-col items-center gap-1 text-primary">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button onClick={() => onNavigate('gestao-entregas')} className="flex flex-col items-center gap-1 text-secondary">
          <Truck className="w-5 h-5" />
          <span className="text-[10px]">Gestão</span>
        </button>
        <button onClick={() => setIsImportOpen(true)} className="flex flex-col items-center gap-1 text-secondary">
          <FileUp className="w-5 h-5" />
          <span className="text-[10px]">Importar</span>
        </button>
      </nav>

      {/* SLIDE-OVER MODAL FOR NEW DELIVERY */}
      {isNewDeliveryOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={() => setIsNewDeliveryOpen(false)}></div>
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                  <div className="px-4 sm:px-6">
                    <div className="flex items-start justify-between">
                      <h2 className="text-base font-bold text-primary" id="slide-over-title">Nova Entrega</h2>
                      <div className="ml-3 flex h-7 items-center">
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                          onClick={() => setIsNewDeliveryOpen(false)}
                        >
                          <X className="h-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative mt-6 flex-1 px-4 sm:px-6">
                    <form onSubmit={handleCreateDelivery} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface block">NF-e (Nota Fiscal)</label>
                        <input
                          type="text"
                          required
                          value={nfe}
                          onChange={(e) => setNfe(e.target.value)}
                          placeholder="Ex: 112.983-01"
                          className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface block">Nome do Cliente</label>
                        <input
                          type="text"
                          required
                          value={cliente}
                          onChange={(e) => setCliente(e.target.value)}
                          placeholder="Ex: Tech Global Solutions"
                          className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface block">Razão Social Completa (Opcional)</label>
                        <input
                          type="text"
                          value={razaoSocial}
                          onChange={(e) => setRazaoSocial(e.target.value)}
                          placeholder="Ex: Tech Global Solutions LTDA"
                          className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-on-surface block">CNPJ / CPF</label>
                          <input
                            type="text"
                            value={cnpjCpf}
                            onChange={(e) => setCnpjCpf(e.target.value)}
                            placeholder="Ex: 12.345.678/0001-90"
                            className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-on-surface block">Valor Cobrança (R$)</label>
                          <input
                            type="number"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            placeholder="Ex: 1250"
                            className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-semibold text-on-surface block">Cidade</label>
                          <input
                            type="text"
                            value={cidade}
                            onChange={(e) => setCidade(e.target.value)}
                            placeholder="Ex: São Paulo"
                            className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-on-surface block">UF</label>
                          <select
                            value={uf}
                            onChange={(e) => setUf(e.target.value)}
                            className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="SP">SP</option>
                            <option value="RJ">RJ</option>
                            <option value="MG">MG</option>
                            <option value="PR">PR</option>
                            <option value="SC">SC</option>
                            <option value="AM">AM</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-on-surface block">Endereço Completo</label>
                        <textarea
                          rows={2}
                          value={endereco}
                          onChange={(e) => setEndereco(e.target.value)}
                          placeholder="Av. Paulista, 1000 - Bela Vista"
                          className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-container transition-all"
                      >
                        Registrar Entrega
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR IMPORT SPREADSHEET */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsImportOpen(false)}></div>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 z-10 border border-outline-variant">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <FileUp className="w-5 h-5 text-primary" />
                <span>Importar Planilha de Manifestos</span>
              </h3>
              <button onClick={() => setIsImportOpen(false)} className="text-outline hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="my-6">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={simulateImport}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-outline-variant hover:bg-surface-container-low'
                }`}
              >
                <FileUp className="w-12 h-12 text-outline mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-on-surface">Arraste e solte seu arquivo de manifestos (.xlsx, .csv)</p>
                <p className="text-xs text-outline mt-1">ou clique para selecionar do seu computador</p>
              </div>
            </div>

            {importSuccess && (
              <div className="text-xs text-on-tertiary-container bg-green-50 p-3 rounded-lg flex items-center gap-2 mb-4 animate-pulse">
                <CheckCircle className="w-4 h-4" />
                <span>Processando linhas e registrando manifestos...</span>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-outline-variant pt-3">
              <button
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 border border-outline-variant text-secondary rounded-lg font-bold text-xs hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                onClick={simulateImport}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-xs hover:brightness-110"
              >
                Selecionar Arquivo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
