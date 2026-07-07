import { useMemo, useState } from 'react';
import { Truck, LogOut, MapPin, Phone, FileText, ExternalLink, CheckCircle2, XCircle, Undo2, Package, Search, Navigation } from 'lucide-react';
import { Delivery, User } from '../types';
import { BaixarEntregaInput } from '../lib/deliveries';
import { getComprovanteUrl } from '../lib/comprovantes';
import { formatNfe } from '../lib/formatNfe';
import { formatDateBR } from '../lib/formatDate';
import Avatar from './layout/Avatar';
import MotoristaBaixaModal from './layout/MotoristaBaixaModal';

interface MotoristaScreenProps {
  user: User;
  deliveries: Delivery[];
  onLogout: () => void;
  onBaixarEntrega: (id: string, input: BaixarEntregaInput) => Promise<void>;
}

const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  ENTREGUE: { label: 'Entregue', className: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  FALHA: { label: 'Falha', className: 'bg-red-100 text-red-800', icon: XCircle },
  DEVOLVIDO: { label: 'Devolvido', className: 'bg-gray-100 text-gray-800', icon: Undo2 },
};

const todayStr = () => new Date().toISOString().split('T')[0];

function enderecoResumo(d: Delivery): string {
  const partes = [
    [d.enderecoCompleto, d.numero].filter(Boolean).join(', '),
    d.bairroDistrito,
    [d.municipio, d.uf].filter(Boolean).join('/'),
  ].filter(Boolean);
  return partes.join(' — ');
}

function gpsUrl(d: Delivery): string {
  const endereco = [enderecoResumo(d), d.cep].filter(Boolean).join(' — ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

export default function MotoristaScreen({ user, deliveries, onLogout, onBaixarEntrega }: MotoristaScreenProps) {
  const [tab, setTab] = useState<'pendentes' | 'concluidas'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [baixaDelivery, setBaixaDelivery] = useState<Delivery | null>(null);
  const [comprovanteLoadingId, setComprovanteLoadingId] = useState<string | null>(null);

  const pendentesTodas = deliveries.filter((d) => d.status === 'EM ROTA' || d.status === 'EM ATRASO');
  const concluidasHojeTodas = deliveries.filter(
    (d) => (d.status === 'ENTREGUE' || d.status === 'FALHA' || d.status === 'DEVOLVIDO') && d.updatedAt.slice(0, 10) === todayStr()
  );

  const filtrar = (lista: Delivery[]) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return lista;
    return lista.filter((d) =>
      d.codigo.toLowerCase().includes(term)
      || d.nfe.toLowerCase().includes(term)
      || d.cliente.toLowerCase().includes(term)
      || d.nomeRazaoSocial.toLowerCase().includes(term)
      || d.municipio.toLowerCase().includes(term)
      || d.bairroDistrito.toLowerCase().includes(term)
    );
  };

  const pendentes = useMemo(() => filtrar(pendentesTodas), [pendentesTodas, searchTerm]);
  const concluidasHoje = useMemo(() => filtrar(concluidasHojeTodas), [concluidasHojeTodas, searchTerm]);

  const handleVerComprovante = async (delivery: Delivery) => {
    if (!delivery.comprovantePath) return;
    setComprovanteLoadingId(delivery.id);
    try {
      const url = await getComprovanteUrl(delivery.comprovantePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível abrir o comprovante.');
    } finally {
      setComprovanteLoadingId(null);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-outline-variant shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-lg shrink-0">
            <Truck className="text-on-primary w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary leading-tight truncate">Minhas Entregas</p>
            <p className="text-[11px] text-on-surface-variant truncate">Olá, {user.name || user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Avatar genero={user.genero} name={user.name} className="w-8 h-8" />
          <button onClick={onLogout} title="Sair" className="text-on-surface-variant hover:text-error">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <nav className="flex bg-white border-b border-outline-variant shrink-0">
        <button
          onClick={() => setTab('pendentes')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            tab === 'pendentes' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
          }`}
        >
          Pendentes ({pendentesTodas.length})
        </button>
        <button
          onClick={() => setTab('concluidas')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            tab === 'concluidas' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
          }`}
        >
          Concluídas hoje ({concluidasHojeTodas.length})
        </button>
      </nav>

      <div className="px-4 pt-3 max-w-lg w-full mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por NF, cliente ou bairro..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <main className="flex-1 p-4 space-y-3 max-w-lg w-full mx-auto">
        {tab === 'pendentes' && (
          pendentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Package className="w-10 h-10 text-outline" />
              <p className="text-sm text-on-surface-variant font-medium">
                {searchTerm ? 'Nenhuma entrega pendente corresponde à busca.' : 'Nenhuma entrega pendente atribuída a você.'}
              </p>
            </div>
          ) : (
            pendentes.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{d.cliente}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{d.nomeRazaoSocial}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-primary shrink-0">{d.codigo}</span>
                </div>

                <div className="space-y-1.5 text-xs text-on-surface-variant">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{enderecoResumo(d) || 'Endereço não informado'}</span>
                  </div>
                  {d.foneFax && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{d.foneFax}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>NF-e {formatNfe(d.nfe)}{d.previsao ? ` · previsão ${formatDateBR(d.previsao)}` : ''}</span>
                  </div>
                </div>

                {enderecoResumo(d) && (
                  <a
                    href={gpsUrl(d)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    <Navigation className="w-3 h-3" /> Abrir no GPS
                  </a>
                )}

                <button
                  onClick={() => setBaixaDelivery(d)}
                  className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-bold text-sm hover:opacity-95 transition-all"
                >
                  Baixar entrega
                </button>
              </div>
            ))
          )
        )}

        {tab === 'concluidas' && (
          concluidasHoje.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Package className="w-10 h-10 text-outline" />
              <p className="text-sm text-on-surface-variant font-medium">
                {searchTerm ? 'Nenhuma entrega concluída corresponde à busca.' : 'Nenhuma entrega concluída hoje ainda.'}
              </p>
            </div>
          ) : (
            concluidasHoje.map((d) => {
              const badge = STATUS_BADGE[d.status];
              const Icon = badge?.icon ?? CheckCircle2;
              return (
                <div key={d.id} className="bg-white rounded-xl border border-outline-variant shadow-sm p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{d.cliente}</p>
                      <span className="text-[10px] font-mono font-bold text-primary">{d.codigo}</span>
                    </div>
                    {badge && (
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${badge.className}`}>
                        <Icon className="w-3 h-3" /> {badge.label}
                      </span>
                    )}
                  </div>
                  {d.nomeRecebedor && <p className="text-xs text-on-surface-variant">Recebedor: {d.nomeRecebedor}</p>}
                  {d.ocorrencia && <p className="text-xs text-on-surface-variant">{d.ocorrencia}</p>}
                  {d.comprovantePath && (
                    <button
                      onClick={() => handleVerComprovante(d)}
                      disabled={comprovanteLoadingId === d.id}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-60"
                    >
                      <ExternalLink className="w-3 h-3" /> {comprovanteLoadingId === d.id ? 'Abrindo...' : 'Ver comprovante'}
                    </button>
                  )}
                </div>
              );
            })
          )
        )}
      </main>

      <MotoristaBaixaModal delivery={baixaDelivery} onClose={() => setBaixaDelivery(null)} onBaixar={onBaixarEntrega} />
    </div>
  );
}
