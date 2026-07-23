import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Receipt, ListChecks, History, Table2, Trash2, Plus, Pencil, X, ChevronDown, Printer, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { ActivePage, Delivery, DeliveryStatus, User } from '../types';
import { Volume, VolumeInput } from '../lib/deliveryVolumes';
import { FreightRate, FreightRateInput, TipoTarifa } from '../lib/freightRates';
import { Invoice, fetchProximoNumeroFatura } from '../lib/invoices';
import { arredondar, calcularFrete, ResultadoFrete, STATUS_DEVOLUCAO } from '../lib/freightCalc';
import { formatNfe } from '../lib/formatNfe';
import { UFS_BR } from '../lib/ufs';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';
import FaturaPrintView from './layout/FaturaPrintView';
import CubagemModal from './layout/CubagemModal';

interface FaturamentoScreenProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  deliveries: Delivery[];
  volumesByDeliveryId: Map<string, Volume[]>;
  freightRates: FreightRate[];
  invoices: Invoice[];
  onUpdateDelivery: (id: string, patch: Partial<Delivery>) => Promise<void>;
  onCreateInvoice: (deliveryIds: string[]) => Promise<Invoice>;
  onRemoveInvoice: (id: string) => Promise<void>;
  onCreateFreightRate: (input: FreightRateInput) => Promise<void>;
  onUpdateFreightRate: (id: string, input: FreightRateInput) => Promise<void>;
  onDeleteFreightRate: (id: string) => Promise<void>;
  onSaveVolumes: (deliveryId: string, volumes: VolumeInput[]) => Promise<void>;
}

type Aba = 'pendentes' | 'historico' | 'tabela';

type CampoOrdenavel =
  | 'nfe' | 'nomeRazaoSocial' | 'uf'
  | 'pesoReal' | 'pesoCubado' | 'pesoConsiderado'
  | 'valorBase' | 'gris' | 'adValorem' | 'icms' | 'valorTotal';

// O valor "acordado" manualmente substitui o total calculado quando
// preenchido — usado tanto pra exibir/ordenar quanto na hora de faturar.
function valorFinal(d: Delivery, calc: ResultadoFrete): number {
  return d.valorAcordado ?? calc.valorTotal;
}

const EMPTY_VOLUMES: Volume[] = [];
const VOLUME_VAZIO: VolumeInput = { peso: 0, altura: 0, largura: 0, comprimento: 0 };

function formatMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function valorOrdenavel(d: Delivery, calc: ResultadoFrete, campo: CampoOrdenavel): string | number {
  switch (campo) {
    case 'nfe': return d.nfe;
    case 'nomeRazaoSocial': return d.nomeRazaoSocial;
    case 'uf': return d.uf;
    case 'pesoReal': return calc.pesoReal;
    case 'pesoCubado': return calc.pesoCubado;
    case 'pesoConsiderado': return calc.pesoConsiderado;
    case 'valorBase': return calc.valorBase;
    case 'gris': return calc.gris;
    case 'adValorem': return calc.adValorem;
    case 'icms': return calc.icms;
    case 'valorTotal': return valorFinal(d, calc);
  }
}

const ALL_STATUS: DeliveryStatus[] = [
  'AGUARDANDO EXPEDIÇÃO', 'EM ROTA', 'EM ATRASO', 'ENTREGUE', 'FALHA', 'EM DEVOLUÇÃO', 'DEVOLVIDO',
];

export default function FaturamentoScreen({
  onNavigate,
  onLogout,
  user,
  deliveries,
  volumesByDeliveryId,
  freightRates,
  invoices,
  onUpdateDelivery,
  onCreateInvoice,
  onRemoveInvoice,
  onCreateFreightRate,
  onUpdateFreightRate,
  onDeleteFreightRate,
  onSaveVolumes,
}: FaturamentoScreenProps) {
  const [aba, setAba] = useState<Aba>('pendentes');
  const [erro, setErro] = useState('');

  // --- Pendentes ---
  const [statusFiltro, setStatusFiltro] = useState<Set<DeliveryStatus>>(new Set(['ENTREGUE']));
  const [statusDropdownAberto, setStatusDropdownAberto] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [remetenteFiltro, setRemetenteFiltro] = useState('');
  const [buscaPendentes, setBuscaPendentes] = useState('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [gerandoFatura, setGerandoFatura] = useState(false);
  const [proximoNumero, setProximoNumero] = useState('');
  const [faturaAberta, setFaturaAberta] = useState<{ invoice: Invoice; deliveries: Delivery[] } | null>(null);
  const [ordenarPor, setOrdenarPor] = useState<CampoOrdenavel | null>(null);
  const [ordenarDirecao, setOrdenarDirecao] = useState<'asc' | 'desc'>('asc');
  const [cubagemDeliveryId, setCubagemDeliveryId] = useState<string | null>(null);

  const carregarProximoNumero = () => {
    fetchProximoNumeroFatura().then(setProximoNumero).catch((err) => console.error('Falha ao buscar próximo número:', err));
  };

  useEffect(carregarProximoNumero, []);

  // Fecha o dropdown de status ao clicar fora dele.
  useEffect(() => {
    function aoClicarFora(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  const toggleStatusFiltro = (status: DeliveryStatus) => {
    setStatusFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
    setRemetenteFiltro('');
    setSelecionadas(new Set());
  };

  // Cada fatura deve ser de um remetente só (cada cliente recebe a sua) —
  // esse select existe justamente pra guiar a seleção nessa direção.
  const remetentesDisponiveis = useMemo(() => {
    const set = new Set(
      deliveries.filter((d) => !d.invoiceId && statusFiltro.has(d.status)).map((d) => d.remetente).filter(Boolean),
    );
    return Array.from(set).sort();
  }, [deliveries, statusFiltro]);

  const pendentes = useMemo(() => {
    const termo = buscaPendentes.toLowerCase().trim();
    return deliveries
      .filter((d) => !d.invoiceId && statusFiltro.has(d.status))
      .filter((d) => !remetenteFiltro || d.remetente === remetenteFiltro)
      .filter(
        (d) =>
          !termo ||
          d.nfe.toLowerCase().includes(termo) ||
          d.nomeRazaoSocial.toLowerCase().includes(termo) ||
          d.cnpjCpf.replace(/\D/g, '').includes(termo.replace(/\D/g, '')),
      );
  }, [deliveries, statusFiltro, remetenteFiltro, buscaPendentes]);

  const calculosPendentes = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calcularFrete>>();
    for (const d of pendentes) {
      map.set(d.id, calcularFrete(d, volumesByDeliveryId.get(d.id) ?? EMPTY_VOLUMES, freightRates));
    }
    return map;
  }, [pendentes, volumesByDeliveryId, freightRates]);

  // Ordenação por coluna — clicar num cabeçalho ordena por aquele campo
  // (inclusive os calculados: peso/frete/taxas), clicar de novo inverte.
  const pendentesOrdenadas = useMemo(() => {
    if (!ordenarPor) return pendentes;
    const arr = [...pendentes];
    arr.sort((a, b) => {
      const av = valorOrdenavel(a, calculosPendentes.get(a.id)!, ordenarPor);
      const bv = valorOrdenavel(b, calculosPendentes.get(b.id)!, ordenarPor);
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
      return ordenarDirecao === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [pendentes, calculosPendentes, ordenarPor, ordenarDirecao]);

  const handleOrdenar = (campo: CampoOrdenavel) => {
    if (ordenarPor === campo) {
      setOrdenarDirecao((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenarPor(campo);
      setOrdenarDirecao('asc');
    }
  };

  function ThOrdenavel({ campo, label, className = 'px-4 py-3' }: { campo: CampoOrdenavel; label: string; className?: string }) {
    return (
      <th
        onClick={() => handleOrdenar(campo)}
        title={`Ordenar por ${label}`}
        className={`cursor-pointer select-none hover:text-primary transition-colors ${className}`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {ordenarPor === campo ? (
            ordenarDirecao === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )}
        </span>
      </th>
    );
  }

  // Edição rápida do 1º volume direto na tabela — cobre o caso comum de 1
  // volume por entrega, sem precisar abrir a tela de Cubagem. Entregas com
  // mais de um volume mostram um aviso e usam o modal completo (mesma tela
  // de Cubagem, reaproveitada) pra não truncar os demais volumes.
  const handleEditarVolumeInline = async (deliveryId: string, campo: keyof VolumeInput, valorStr: string) => {
    const valor = Number(valorStr.replace(',', '.'));
    if (!Number.isFinite(valor) || valor < 0) return;
    const atuais = volumesByDeliveryId.get(deliveryId) ?? [];
    const primeiro: VolumeInput = atuais[0]
      ? { peso: atuais[0].peso, altura: atuais[0].altura, largura: atuais[0].largura, comprimento: atuais[0].comprimento }
      : { ...VOLUME_VAZIO };
    if (primeiro[campo] === valor) return;
    const resto = atuais.slice(1).map((v) => ({ peso: v.peso, altura: v.altura, largura: v.largura, comprimento: v.comprimento }));
    try {
      await onSaveVolumes(deliveryId, [{ ...primeiro, [campo]: valor }, ...resto]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a cubagem.');
    }
  };

  // Frete negociado manualmente — campo vazio remove o acordo (volta a usar
  // o valor calculado); preenchido, substitui o total dessa linha.
  const handleEditarValorAcordado = async (deliveryId: string, valorStr: string) => {
    const texto = valorStr.trim();
    const bruto = texto === '' ? null : Number(texto.replace(',', '.'));
    if (bruto !== null && (!Number.isFinite(bruto) || bruto < 0)) return;
    const novoValor = bruto !== null ? arredondar(bruto) : null;
    try {
      await onUpdateDelivery(deliveryId, { valorAcordado: novoValor });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o valor acordado.');
    }
  };

  // Reentrega é um flag manual — devolução usa o status EM DEVOLUÇÃO/DEVOLVIDO
  // já existente, sem precisar de flag (por isso não tem handler equivalente).
  const handleToggleReentrega = async (deliveryId: string, valor: boolean) => {
    try {
      await onUpdateDelivery(deliveryId, { reentrega: valor });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível atualizar a reentrega.');
    }
  };

  // Resolve por id contra TODAS as entregas (não só as visíveis em "pendentes"
  // no momento) — a seleção persiste enquanto o usuário digita na busca, então
  // não pode depender da lista filtrada pra não quebrar quando um item
  // selecionado sai de vista.
  const calcularPorId = (id: string) => {
    const delivery = deliveries.find((d) => d.id === id);
    if (!delivery) return null;
    return { delivery, calc: calcularFrete(delivery, volumesByDeliveryId.get(id) ?? EMPTY_VOLUMES, freightRates) };
  };

  const totalSelecionado = useMemo(() => {
    let soma = 0;
    for (const id of selecionadas) {
      const item = calcularPorId(id);
      if (item) soma += valorFinal(item.delivery, item.calc);
    }
    return soma;
  }, [selecionadas, deliveries, volumesByDeliveryId, freightRates]);

  const toggleSelecionada = (id: string) => {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodasPendentes = () => {
    setSelecionadas((prev) => (prev.size === pendentes.length ? new Set() : new Set(pendentes.map((d) => d.id))));
  };

  const handleGerarFatura = async () => {
    setErro('');
    if (selecionadas.size === 0) {
      setErro('Selecione ao menos uma entrega.');
      return;
    }

    const ids = Array.from(selecionadas);
    const selecionadasComCalculo = ids
      .map((id) => calcularPorId(id))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const remetentesNaSelecao = new Set(selecionadasComCalculo.map(({ delivery }) => delivery.remetente));
    if (remetentesNaSelecao.size > 1) {
      setErro('Selecione entregas de um único remetente por fatura (cada cliente recebe a sua).');
      return;
    }

    setGerandoFatura(true);
    try {
      // Grava o valor final (acordado manualmente, se houver, senão o
      // calculado) em cada entrega antes de vincular à fatura, pra "congelar"
      // o valor faturado mesmo que a tabela de frete mude depois.
      await Promise.all(
        selecionadasComCalculo.map(({ delivery, calc }) => onUpdateDelivery(delivery.id, { valorFreteCalculado: valorFinal(delivery, calc) })),
      );
      const created = await onCreateInvoice(ids);

      // Monta a lista pro relatório na hora, sem esperar o refetch de "deliveries"
      // (a prop só chega atualizada no próximo render deste componente).
      const deliveriesFaturadas = selecionadasComCalculo.map(({ delivery, calc }) => ({
        ...delivery,
        valorFreteCalculado: valorFinal(delivery, calc),
        invoiceId: created.id,
      }));

      setSelecionadas(new Set());
      carregarProximoNumero();
      setFaturaAberta({ invoice: created, deliveries: deliveriesFaturadas });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gerar a fatura.');
    } finally {
      setGerandoFatura(false);
    }
  };

  // --- Histórico ---
  const [invoiceExpandida, setInvoiceExpandida] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const deliveriesPorInvoice = useMemo(() => {
    const map = new Map<string, Delivery[]>();
    for (const d of deliveries) {
      if (!d.invoiceId) continue;
      const lista = map.get(d.invoiceId);
      if (lista) lista.push(d);
      else map.set(d.invoiceId, [d]);
    }
    return map;
  }, [deliveries]);

  const handleRemoverFatura = async (id: string) => {
    if (!window.confirm('Desfazer essa fatura? As entregas voltam para "pendente".')) return;
    setRemovendoId(id);
    setErro('');
    try {
      await onRemoveInvoice(id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível remover a fatura.');
    } finally {
      setRemovendoId(null);
    }
  };

  // --- Tabela de frete ---
  const podeEditarTabela = user.profileType === 'master';
  const [buscaTabela, setBuscaTabela] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formTabela, setFormTabela] = useState<FreightRateInput | null>(null);
  const [salvandoTarifa, setSalvandoTarifa] = useState(false);

  const tarifasFiltradas = useMemo(() => {
    const termo = buscaTabela.trim().toUpperCase();
    if (!termo) return freightRates;
    return freightRates.filter((t) => t.uf.includes(termo) || t.cepInicial.includes(termo) || t.cepFinal.includes(termo));
  }, [freightRates, buscaTabela]);

  const FORM_TABELA_VAZIO: FreightRateInput = {
    uf: 'SP',
    tipoTarifa: 'Capital',
    cepInicial: '',
    cepFinal: '',
    valor5kg: 0,
    valor10kg: 0,
    valor15kg: 0,
    valor20kg: 0,
    valor30kg: 0,
    kgAdicional: 0,
  };

  const iniciarNovaTarifa = () => {
    setEditandoId('novo');
    setFormTabela(FORM_TABELA_VAZIO);
  };

  const iniciarEdicaoTarifa = (tarifa: FreightRate) => {
    setEditandoId(tarifa.id);
    setFormTabela({
      uf: tarifa.uf,
      tipoTarifa: tarifa.tipoTarifa,
      cepInicial: tarifa.cepInicial,
      cepFinal: tarifa.cepFinal,
      valor5kg: tarifa.valor5kg,
      valor10kg: tarifa.valor10kg,
      valor15kg: tarifa.valor15kg,
      valor20kg: tarifa.valor20kg,
      valor30kg: tarifa.valor30kg,
      kgAdicional: tarifa.kgAdicional,
    });
  };

  const cancelarEdicaoTarifa = () => {
    setEditandoId(null);
    setFormTabela(null);
  };

  const salvarTarifa = async () => {
    if (!formTabela) return;
    setSalvandoTarifa(true);
    setErro('');
    try {
      if (editandoId && editandoId !== 'novo') {
        await onUpdateFreightRate(editandoId, formTabela);
      } else {
        await onCreateFreightRate(formTabela);
      }
      cancelarEdicaoTarifa();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a tarifa.');
    } finally {
      setSalvandoTarifa(false);
    }
  };

  const excluirTarifa = async (id: string) => {
    if (!window.confirm('Remover essa faixa de tarifa da tabela de frete?')) return;
    setErro('');
    try {
      await onDeleteFreightRate(id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível remover a tarifa.');
    }
  };

  const TABS: { key: Aba; label: string; icon: typeof ListChecks }[] = [
    { key: 'pendentes', label: 'Pendentes', icon: ListChecks },
    { key: 'historico', label: 'Histórico de Faturas', icon: History },
    { key: 'tabela', label: 'Tabela de Frete', icon: Table2 },
  ];

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">
      <Sidebar
        activePage="faturamento"
        onNavigate={onNavigate}
        onNovaEntrega={() => {}}
        onImportar={() => {}}
        onLogout={onLogout}
        onUsuarios={user.profileType === 'master' ? () => onNavigate('usuarios') : undefined}
        onIntegracoes={user.profileType === 'master' ? () => onNavigate('integracoes') : undefined}
        onCubagem={user.profileType === 'master' ? () => onNavigate('cubagem') : undefined}
        onFaturamento={() => onNavigate('faturamento')}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <OperadorTopBar profile={user} />

        <main className="flex-1 p-6 w-full overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="font-headline text-3xl font-bold text-primary mb-1 flex items-center gap-2">
                <Receipt className="w-7 h-7" />
                Faturamento
              </h1>
              <div className="flex items-center text-on-surface-variant gap-2 text-xs">
                <span>Logística</span>
                <ChevronRight className="w-4 h-4 text-outline" />
                <span className="text-primary font-bold">
                  {TABS.find((t) => t.key === aba)?.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white border border-outline-variant rounded-xl px-4 py-2.5 shadow-sm">
              <div className="text-right">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Próxima fatura</p>
                <p className="text-lg font-extrabold text-primary leading-none">{proximoNumero || '...'}</p>
              </div>
              <div className="h-8 w-px bg-outline-variant" />
              <div className="text-xs text-on-surface-variant">
                {selecionadas.size > 0 ? (
                  <>
                    <span className="font-bold text-on-surface">{selecionadas.size}</span> selecionada(s)
                    <br />
                    <span className="font-bold text-primary">R$ {formatMoeda(totalSelecionado)}</span>
                  </>
                ) : (
                  'Selecione entregas na aba Pendentes'
                )}
              </div>
              <button
                onClick={handleGerarFatura}
                disabled={gerandoFatura || selecionadas.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold hover:opacity-95 disabled:opacity-40 transition-all shadow-sm"
              >
                <Receipt className="w-4 h-4" />
                {gerandoFatura ? 'Gerando...' : 'Gerar Fatura'}
              </button>
            </div>
          </div>

          {erro && (
            <div className="mb-4 px-4 py-2 bg-error-container/20 border border-error/30 text-error text-sm font-semibold rounded-lg">
              {erro}
            </div>
          )}

          <div className="flex gap-2 mb-6">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setAba(key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  aba === key
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-white border border-outline-variant text-on-surface-variant hover:bg-surface-variant/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {aba === 'pendentes' && (
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-outline-variant flex flex-wrap gap-3 items-center justify-between bg-surface-container-low/30">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative" ref={statusDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setStatusDropdownAberto((prev) => !prev)}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                    >
                      Status: {statusFiltro.size === 0 ? 'Nenhum' : statusFiltro.size === 1 ? Array.from(statusFiltro)[0] : `${statusFiltro.size} selecionados`}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${statusDropdownAberto ? 'rotate-180' : ''}`} />
                    </button>
                    {statusDropdownAberto && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-64 bg-white border border-outline-variant rounded-lg shadow-lg py-1.5">
                        {ALL_STATUS.map((s) => (
                          <label key={s} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-surface-container-low">
                            <input type="checkbox" checked={statusFiltro.has(s)} onChange={() => toggleStatusFiltro(s)} />
                            {s}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <select
                    value={remetenteFiltro}
                    onChange={(e) => { setRemetenteFiltro(e.target.value); setSelecionadas(new Set()); }}
                    className="px-3 py-2 border border-outline-variant rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                  >
                    <option value="">Remetente: Todos</option>
                    {remetentesDisponiveis.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Buscar por NF-e, Destinatário ou CNPJ/CPF..."
                    value={buscaPendentes}
                    onChange={(e) => setBuscaPendentes(e.target.value)}
                    className="w-full sm:w-80 pl-4 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <span className="text-xs font-semibold text-on-surface-variant">
                  {pendentes.length} entrega(s) pendente(s) de faturar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low border-b border-outline-variant text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={pendentes.length > 0 && selecionadas.size === pendentes.length}
                          onChange={toggleTodasPendentes}
                        />
                      </th>
                      <ThOrdenavel campo="nfe" label="NF-e" />
                      <ThOrdenavel campo="nomeRazaoSocial" label="Destinatário" />
                      <ThOrdenavel campo="uf" label="UF/CEP" />
                      <ThOrdenavel campo="pesoReal" label="Peso Real" className="px-4 py-3 text-right" />
                      <th className="px-3 py-3 text-right" title="Peso do volume (kg) — apurado na Cubagem">Peso (kg)</th>
                      <th className="px-3 py-3 text-right" title="Altura do volume (cm) — apurada na Cubagem">Alt.(cm)</th>
                      <th className="px-3 py-3 text-right" title="Largura do volume (cm) — apurada na Cubagem">Larg.(cm)</th>
                      <th className="px-3 py-3 text-right" title="Comprimento do volume (cm) — apurado na Cubagem">Compr.(cm)</th>
                      <ThOrdenavel campo="pesoCubado" label="Peso Cubado" className="px-4 py-3 text-right" />
                      <ThOrdenavel campo="pesoConsiderado" label="Peso Consid." className="px-4 py-3 text-right" />
                      <ThOrdenavel campo="valorBase" label="Frete Base" className="px-4 py-3 text-right" />
                      <ThOrdenavel campo="gris" label="GRIS" className="px-4 py-3 text-right" />
                      <ThOrdenavel campo="adValorem" label="Ad Valorem" className="px-4 py-3 text-right" />
                      <ThOrdenavel campo="icms" label="ICMS" className="px-4 py-3 text-right" />
                      <th className="px-3 py-3 text-center" title="Reentrega soma 50% do frete base (manual); devolução soma 100% automaticamente pelo status">Reentrega</th>
                      <th className="px-3 py-3 text-right" title="Frete negociado manualmente — quando preenchido, substitui o total calculado dessa linha">Valor Acordado</th>
                      <ThOrdenavel campo="valorTotal" label="Total" className="px-4 py-3 text-right" />
                      <th className="px-3 py-3 text-right">Cubagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {pendentesOrdenadas.length > 0 ? (
                      pendentesOrdenadas.map((d) => {
                        const calc = calculosPendentes.get(d.id)!;
                        const volumes = volumesByDeliveryId.get(d.id) ?? EMPTY_VOLUMES;
                        const primeiroVolume = volumes[0];
                        const temMultiplosVolumes = volumes.length > 1;
                        const inputClass = 'w-16 px-1.5 py-1 border border-transparent hover:border-outline-variant focus:border-primary rounded text-xs text-right font-mono outline-none bg-transparent focus:bg-white';
                        return (
                          <tr key={d.id} className={`hover:bg-primary/5 transition-colors ${!calc.tarifaEncontrada ? 'bg-error-container/10' : ''}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={selecionadas.has(d.id)} onChange={() => toggleSelecionada(d.id)} />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-primary font-bold whitespace-nowrap">{formatNfe(d.nfe)}</td>
                            <td className="px-4 py-3 text-xs text-on-surface whitespace-nowrap max-w-[220px] truncate" title={d.nomeRazaoSocial}>{d.nomeRazaoSocial}</td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">{d.uf} · {d.cep || '—'}</td>
                            {/* Soma o peso de TODOS os volumes (calc.pesoReal) — só leitura,
                                diferente da coluna "Peso (kg)" ao lado, que edita o volume 1. */}
                            <td className="px-4 py-3 text-xs text-right">{calc.pesoReal.toFixed(2)} kg</td>
                            <td className="px-3 py-3 text-right">
                              <input
                                key={`${d.id}-peso`}
                                type="number"
                                step="0.01"
                                defaultValue={primeiroVolume?.peso ?? ''}
                                onBlur={(e) => handleEditarVolumeInline(d.id, 'peso', e.target.value)}
                                disabled={temMultiplosVolumes}
                                title={temMultiplosVolumes ? 'Múltiplos volumes — edite pelo botão de Cubagem' : 'Peso (kg) do volume'}
                                className={inputClass}
                              />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <input
                                key={`${d.id}-altura`}
                                type="number"
                                step="0.01"
                                defaultValue={primeiroVolume?.altura ?? ''}
                                onBlur={(e) => handleEditarVolumeInline(d.id, 'altura', e.target.value)}
                                disabled={temMultiplosVolumes}
                                title={temMultiplosVolumes ? 'Múltiplos volumes — edite pelo botão de Cubagem' : 'Altura (cm) do volume'}
                                className={inputClass}
                              />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <input
                                key={`${d.id}-largura`}
                                type="number"
                                step="0.01"
                                defaultValue={primeiroVolume?.largura ?? ''}
                                onBlur={(e) => handleEditarVolumeInline(d.id, 'largura', e.target.value)}
                                disabled={temMultiplosVolumes}
                                title={temMultiplosVolumes ? 'Múltiplos volumes — edite pelo botão de Cubagem' : 'Largura (cm) do volume'}
                                className={inputClass}
                              />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <input
                                key={`${d.id}-comprimento`}
                                type="number"
                                step="0.01"
                                defaultValue={primeiroVolume?.comprimento ?? ''}
                                onBlur={(e) => handleEditarVolumeInline(d.id, 'comprimento', e.target.value)}
                                disabled={temMultiplosVolumes}
                                title={temMultiplosVolumes ? 'Múltiplos volumes — edite pelo botão de Cubagem' : 'Comprimento (cm) do volume'}
                                className={inputClass}
                              />
                            </td>
                            <td className="px-4 py-3 text-xs text-right">{calc.pesoCubado.toFixed(2)} kg</td>
                            <td className="px-4 py-3 text-xs text-right font-bold">{calc.pesoConsiderado.toFixed(2)} kg</td>
                            <td className="px-4 py-3 text-xs text-right">
                              {calc.tarifaEncontrada ? `R$ ${formatMoeda(calc.valorBase)}` : (
                                <span className="text-error font-bold">sem tarifa</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-right">R$ {formatMoeda(calc.gris)}</td>
                            <td className="px-4 py-3 text-xs text-right">R$ {formatMoeda(calc.adValorem)}</td>
                            <td className="px-4 py-3 text-xs text-right" title={`Alíquota aplicada: ${(calc.aliquotaIcms * 100).toFixed(0)}% (origem SP → destino ${d.uf})`}>
                              R$ {formatMoeda(calc.icms)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {STATUS_DEVOLUCAO.includes(d.status) ? (
                                <span className="text-[9px] font-bold text-orange-700 uppercase" title="Devolução: soma 100% do frete base automaticamente pelo status">Devolução auto</span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={d.reentrega}
                                  onChange={() => handleToggleReentrega(d.id, !d.reentrega)}
                                  title="Houve reentrega? soma 50% do frete base"
                                />
                              )}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <input
                                key={`${d.id}-valor-acordado`}
                                type="number"
                                step="0.01"
                                defaultValue={d.valorAcordado ?? ''}
                                onBlur={(e) => handleEditarValorAcordado(d.id, e.target.value)}
                                placeholder="—"
                                title="Frete negociado manualmente — substitui o total calculado quando preenchido"
                                className={inputClass}
                              />
                            </td>
                            <td className="px-4 py-3 text-xs text-right font-bold text-primary whitespace-nowrap">
                              R$ {formatMoeda(valorFinal(d, calc))}
                              {d.valorAcordado != null && <span className="ml-1 text-[9px] font-bold text-secondary uppercase">acordado</span>}
                              {d.valorAcordado == null && calc.acrescimoReentrega > 0 && <span className="ml-1 text-[9px] font-bold text-amber-700 uppercase">+reentrega</span>}
                              {d.valorAcordado == null && calc.acrescimoDevolucao > 0 && <span className="ml-1 text-[9px] font-bold text-orange-700 uppercase">+devolução</span>}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => setCubagemDeliveryId(d.id)}
                                title={temMultiplosVolumes ? `${volumes.length} volumes — editar todos` : 'Editar cubagem completa'}
                                className="inline-flex items-center gap-1 p-1.5 border border-outline text-on-surface-variant rounded-lg hover:bg-secondary-container transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                {temMultiplosVolumes && <span className="text-[10px] font-bold">+{volumes.length}</span>}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={19} className="text-center py-8 text-sm text-secondary font-medium">
                          Nenhuma entrega pendente de faturar com esse filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t border-outline-variant bg-surface-container-low/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant">{selecionadas.size} selecionada(s)</span>
                <span className="text-sm font-bold text-primary">Total: R$ {formatMoeda(totalSelecionado)}</span>
              </div>
            </div>
          )}

          {aba === 'historico' && (
            <div className="space-y-3">
              {invoices.length === 0 && (
                <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-8 text-center text-sm text-secondary font-medium">
                  Nenhuma fatura gerada ainda.
                </div>
              )}
              {invoices.map((inv) => {
                const itens = deliveriesPorInvoice.get(inv.id) ?? [];
                const total = itens.reduce((soma, d) => soma + (d.valorFreteCalculado ?? 0), 0);
                const expandida = invoiceExpandida === inv.id;
                return (
                  <div key={inv.id} className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setInvoiceExpandida(expandida ? null : inv.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setInvoiceExpandida(expandida ? null : inv.id); }}
                      className="w-full flex items-center justify-between gap-4 p-4 hover:bg-surface-variant/20 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${expandida ? 'rotate-180' : ''}`} />
                        <div>
                          <p className="text-sm font-bold text-on-surface">Fatura {inv.numero}</p>
                          <p className="text-xs text-on-surface-variant">{formatDataHora(inv.criadoEm)} · {itens.length} entrega(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary mr-2">R$ {formatMoeda(total)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFaturaAberta({ invoice: inv, deliveries: itens }); }}
                          className="p-1.5 border border-outline text-on-surface-variant hover:bg-secondary-container rounded-lg transition-colors"
                          title="Reimprimir / gerar PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoverFatura(inv.id); }}
                          className="p-1.5 text-error hover:bg-error-container/20 rounded-lg transition-colors"
                          title="Desfazer fatura"
                        >
                          {removendoId === inv.id ? '...' : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {expandida && (
                      <div className="border-t border-outline-variant overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                            <tr>
                              <th className="px-4 py-2">NF-e</th>
                              <th className="px-4 py-2">Destinatário</th>
                              <th className="px-4 py-2">Status</th>
                              <th className="px-4 py-2 text-right">Valor Faturado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant">
                            {itens.map((d) => (
                              <tr key={d.id}>
                                <td className="px-4 py-2 font-mono text-xs text-primary font-bold">{formatNfe(d.nfe)}</td>
                                <td className="px-4 py-2 text-xs">{d.nomeRazaoSocial}</td>
                                <td className="px-4 py-2 text-xs">{d.status}</td>
                                <td className="px-4 py-2 text-xs text-right font-bold">
                                  R$ {formatMoeda(d.valorFreteCalculado ?? 0)}
                                  {d.reentrega && <span className="ml-1 text-[9px] font-bold text-amber-700 uppercase">+reentrega</span>}
                                  {STATUS_DEVOLUCAO.includes(d.status) && <span className="ml-1 text-[9px] font-bold text-orange-700 uppercase">+devolução</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {aba === 'tabela' && (
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-outline-variant flex flex-wrap gap-3 items-center justify-between bg-surface-container-low/30">
                <input
                  type="text"
                  placeholder="Buscar por UF ou CEP..."
                  value={buscaTabela}
                  onChange={(e) => setBuscaTabela(e.target.value)}
                  className="w-full sm:w-72 pl-4 pr-4 py-2 border border-outline-variant rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary outline-none"
                />
                {podeEditarTabela ? (
                  <button
                    onClick={iniciarNovaTarifa}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-95 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Nova faixa
                  </button>
                ) : (
                  <span className="text-xs text-on-surface-variant italic">Somente o perfil master edita a tabela de frete.</span>
                )}
              </div>

              {formTabela && (
                <div className="p-4 border-b border-outline-variant bg-primary/5 flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase block">UF</label>
                    <select
                      value={formTabela.uf}
                      onChange={(e) => setFormTabela((f) => f && { ...f, uf: e.target.value })}
                      className="p-2 border border-outline-variant rounded-lg text-xs bg-white outline-none"
                    >
                      {UFS_BR.map((u) => <option key={u.sigla} value={u.sigla}>{u.sigla}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase block">Tipo</label>
                    <select
                      value={formTabela.tipoTarifa}
                      onChange={(e) => setFormTabela((f) => f && { ...f, tipoTarifa: e.target.value as TipoTarifa })}
                      className="p-2 border border-outline-variant rounded-lg text-xs bg-white outline-none"
                    >
                      <option value="Capital">Capital</option>
                      <option value="Interior">Interior</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase block">CEP Inicial</label>
                    <input value={formTabela.cepInicial} onChange={(e) => setFormTabela((f) => f && { ...f, cepInicial: e.target.value })} placeholder="00000-000" className="w-28 p-2 border border-outline-variant rounded-lg text-xs font-mono outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase block">CEP Final</label>
                    <input value={formTabela.cepFinal} onChange={(e) => setFormTabela((f) => f && { ...f, cepFinal: e.target.value })} placeholder="00000-000" className="w-28 p-2 border border-outline-variant rounded-lg text-xs font-mono outline-none" />
                  </div>
                  {([
                    ['valor5kg', 'até 5kg'],
                    ['valor10kg', 'até 10kg'],
                    ['valor15kg', 'até 15kg'],
                    ['valor20kg', 'até 20kg'],
                    ['valor30kg', 'até 30kg'],
                    ['kgAdicional', 'kg Adicional'],
                  ] as const).map(([campo, label]) => (
                    <div key={campo} className="space-y-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase block">{label}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formTabela[campo]}
                        onChange={(e) => setFormTabela((f) => f && { ...f, [campo]: Number(e.target.value) })}
                        className="w-24 p-2 border border-outline-variant rounded-lg text-xs font-mono outline-none"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={salvarTarifa}
                      disabled={salvandoTarifa}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-95 disabled:opacity-50"
                    >
                      {salvandoTarifa ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={cancelarEdicaoTarifa} className="p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-variant/40">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low border-b border-outline-variant text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3">UF</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">CEP Inicial</th>
                      <th className="px-4 py-3">CEP Final</th>
                      <th className="px-4 py-3 text-right">até 5kg</th>
                      <th className="px-4 py-3 text-right">até 10kg</th>
                      <th className="px-4 py-3 text-right">até 15kg</th>
                      <th className="px-4 py-3 text-right">até 20kg</th>
                      <th className="px-4 py-3 text-right">até 30kg</th>
                      <th className="px-4 py-3 text-right">kg Adic.</th>
                      {podeEditarTabela && <th className="px-4 py-3 text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {tarifasFiltradas.map((t) => (
                      <tr key={t.id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-bold">{t.uf}</td>
                        <td className="px-4 py-2.5 text-xs">{t.tipoTarifa}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{t.cepInicial}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{t.cepFinal}</td>
                        <td className="px-4 py-2.5 text-xs text-right">R$ {formatMoeda(t.valor5kg)}</td>
                        <td className="px-4 py-2.5 text-xs text-right">R$ {formatMoeda(t.valor10kg)}</td>
                        <td className="px-4 py-2.5 text-xs text-right">R$ {formatMoeda(t.valor15kg)}</td>
                        <td className="px-4 py-2.5 text-xs text-right">R$ {formatMoeda(t.valor20kg)}</td>
                        <td className="px-4 py-2.5 text-xs text-right">R$ {formatMoeda(t.valor30kg)}</td>
                        <td className="px-4 py-2.5 text-xs text-right">R$ {formatMoeda(t.kgAdicional)}</td>
                        {podeEditarTabela && (
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => iniciarEdicaoTarifa(t)} className="p-1.5 border border-outline text-on-surface-variant rounded-lg hover:bg-secondary-container transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => excluirTarifa(t.id)} className="p-1.5 border border-outline text-error rounded-lg hover:bg-error-container/20 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {faturaAberta && (
        <FaturaPrintView
          invoice={faturaAberta.invoice}
          deliveries={faturaAberta.deliveries}
          onClose={() => setFaturaAberta(null)}
        />
      )}

      <CubagemModal
        delivery={cubagemDeliveryId ? deliveries.find((d) => d.id === cubagemDeliveryId) ?? null : null}
        volumes={(cubagemDeliveryId && volumesByDeliveryId.get(cubagemDeliveryId)) || EMPTY_VOLUMES}
        onClose={() => setCubagemDeliveryId(null)}
        onSave={onSaveVolumes}
      />
    </div>
  );
}
