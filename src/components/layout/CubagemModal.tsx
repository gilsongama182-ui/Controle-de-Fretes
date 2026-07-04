import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { Delivery } from '../../types';
import { formatNfe } from '../../lib/formatNfe';
import { Volume, VolumeInput } from '../../lib/deliveryVolumes';

interface CubagemModalProps {
  delivery: Delivery | null;
  volumes: Volume[];
  onClose: () => void;
  onSave: (deliveryId: string, volumes: VolumeInput[]) => Promise<void>;
}

const EMPTY_VOLUME: VolumeInput = { peso: 0, altura: 0, largura: 0, comprimento: 0 };

export default function CubagemModal({ delivery, volumes, onClose, onSave }: CubagemModalProps) {
  const [drafts, setDrafts] = useState<VolumeInput[]>([EMPTY_VOLUME]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Semeia os rascunhos a partir dos volumes já salvos sempre que o modal
  // abre pra uma entrega diferente (ou some, quando delivery vira null).
  useEffect(() => {
    if (!delivery) return;
    setError('');
    setDrafts(
      volumes.length > 0
        ? volumes.map((v) => ({ peso: v.peso, altura: v.altura, largura: v.largura, comprimento: v.comprimento }))
        : [EMPTY_VOLUME]
    );
  }, [delivery, volumes]);

  if (!delivery) return null;

  const updateDraft = (index: number, field: keyof VolumeInput, value: number) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const addVolume = () => setDrafts((prev) => [...prev, { ...EMPTY_VOLUME }]);

  const removeVolume = (index: number) => setDrafts((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setError('');
    setIsSaving(true);
    try {
      await onSave(delivery.id, drafts);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a cubagem.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-primary">Cubagem</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              NF-e {formatNfe(delivery.nfe)} — Pedido {delivery.pedido || '—'}
            </p>
            <p className="text-xs text-on-surface-variant">
              {delivery.nomeRazaoSocial} · {delivery.cnpjCpf}
            </p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {drafts.map((draft, index) => (
            <div key={index} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Volume {index + 1}</span>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVolume(index)}
                    className="text-error hover:bg-error-container/20 rounded p-1"
                    title="Remover volume"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase block">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.peso}
                    onChange={(e) => updateDraft(index, 'peso', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-outline-variant rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase block">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.altura}
                    onChange={(e) => updateDraft(index, 'altura', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-outline-variant rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase block">Largura (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.largura}
                    onChange={(e) => updateDraft(index, 'largura', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-outline-variant rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase block">Comprimento (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.comprimento}
                    onChange={(e) => updateDraft(index, 'comprimento', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-outline-variant rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addVolume}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-outline-variant rounded-lg text-xs font-bold text-secondary hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Volume
        </button>

        {error && <p className="text-xs text-error font-semibold">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:opacity-95 transition-all shadow-md text-sm disabled:opacity-75"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? 'Salvando...' : 'Salvar Cubagem'}
        </button>
      </div>
    </div>
  );
}
