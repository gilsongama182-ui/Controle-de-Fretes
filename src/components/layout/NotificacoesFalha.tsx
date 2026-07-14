import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { Delivery } from '../../types';
import { isFalhaNaoLida, ultimasFalhas } from '../../lib/deliveryStatus';
import { formatNfe } from '../../lib/formatNfe';
import { formatDateBR } from '../../lib/formatDate';
import { DeliveryOcorrencia } from '../../lib/deliveryOcorrencias';

interface NotificacoesFalhaProps {
  deliveries: Delivery[];
  onMarkRead: (id: string) => Promise<void>;
  ocorrenciasByDeliveryId: Map<string, DeliveryOcorrencia[]>;
}

function ultimaOcorrenciaLabel(ocorrencias: DeliveryOcorrencia[] | undefined): string {
  if (!ocorrencias || ocorrencias.length === 0) return 'Nenhuma ocorrência registrada.';
  const ultima = [...ocorrencias].sort((a, b) => b.dataOcorrencia.localeCompare(a.dataOcorrencia))[0];
  return `${ultima.tipo} (${formatDateBR(ultima.dataOcorrencia)})`;
}

export default function NotificacoesFalha({ deliveries, onMarkRead, ocorrenciasByDeliveryId }: NotificacoesFalhaProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'alertas' | 'historico'>('alertas');
  const containerRef = useRef<HTMLDivElement>(null);

  const naoLidas = useMemo(() => deliveries.filter(isFalhaNaoLida), [deliveries]);
  const historico = useMemo(() => ultimasFalhas(deliveries), [deliveries]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async () => {
    await Promise.all(naoLidas.map((d) => onMarkRead(d.id)));
  };

  const list = tab === 'alertas' ? naoLidas : historico;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-2 hover:bg-secondary-container/50 transition-colors duration-200 rounded-full text-secondary relative"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {naoLidas.length > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-error text-white text-[9px] font-bold rounded-full border-2 border-surface">
            {naoLidas.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl border border-outline-variant shadow-lg z-50 overflow-hidden">
          <div className="flex border-b border-outline-variant text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setTab('alertas')}
              className={`flex-1 py-3 transition-colors ${tab === 'alertas' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              Alertas{naoLidas.length > 0 ? ` (${naoLidas.length})` : ''}
            </button>
            <button
              onClick={() => setTab('historico')}
              className={`flex-1 py-3 transition-colors ${tab === 'historico' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              Histórico
            </button>
          </div>

          {tab === 'alertas' && naoLidas.length > 0 && (
            <div className="px-3 py-2 border-b border-outline-variant bg-surface-container-low/40 flex justify-end">
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                Marcar todas como lidas
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant">
            {list.length === 0 ? (
              <p className="text-center py-8 text-xs text-on-surface-variant font-medium">
                {tab === 'alertas' ? 'Nenhum alerta pendente.' : 'Nenhuma ocorrência de falha ainda.'}
              </p>
            ) : (
              list.map((d) => (
                <div key={d.id} className="p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-error">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      NF-e {formatNfe(d.nfe)}
                    </span>
                    {tab === 'alertas' && (
                      <button
                        onClick={() => onMarkRead(d.id)}
                        className="text-[10px] font-bold text-primary hover:underline shrink-0"
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-on-surface">{d.nomeRazaoSocial}</p>
                  <p className="text-xs text-on-surface-variant">{ultimaOcorrenciaLabel(ocorrenciasByDeliveryId.get(d.id))}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
