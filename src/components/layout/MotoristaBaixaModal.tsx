import React, { useState } from 'react';
import { X, Camera, Loader2, CheckCircle2, XCircle, Undo2 } from 'lucide-react';
import { Delivery, DeliveryStatus } from '../../types';
import { formatNfe } from '../../lib/formatNfe';
import { uploadComprovante } from '../../lib/comprovantes';
import { BaixarEntregaInput } from '../../lib/deliveries';

type Desfecho = Extract<DeliveryStatus, 'ENTREGUE' | 'FALHA' | 'DEVOLVIDO'>;

interface MotoristaBaixaModalProps {
  delivery: Delivery | null;
  onClose: () => void;
  onBaixar: (id: string, input: BaixarEntregaInput) => Promise<void>;
}

const DESFECHOS: { value: Desfecho; label: string; icon: typeof CheckCircle2; activeClass: string }[] = [
  { value: 'ENTREGUE', label: 'Entregue', icon: CheckCircle2, activeClass: 'border-green-500 bg-green-50 text-green-800' },
  { value: 'FALHA', label: 'Falha', icon: XCircle, activeClass: 'border-red-500 bg-red-50 text-red-800' },
  { value: 'DEVOLVIDO', label: 'Devolvido', icon: Undo2, activeClass: 'border-gray-500 bg-gray-50 text-gray-800' },
];

const todayStr = () => new Date().toISOString().split('T')[0];

export default function MotoristaBaixaModal({ delivery, onClose, onBaixar }: MotoristaBaixaModalProps) {
  const [status, setStatus] = useState<Desfecho>('ENTREGUE');
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [dataEntrega, setDataEntrega] = useState(todayStr());
  const [ocorrencia, setOcorrencia] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!delivery) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (status === 'ENTREGUE' && !nomeRecebedor.trim()) {
      setError('Informe o nome de quem recebeu a entrega.');
      return;
    }
    if (status !== 'ENTREGUE' && !ocorrencia.trim()) {
      setError('Descreva a ocorrência para registrar falha ou devolução.');
      return;
    }

    setIsSaving(true);
    try {
      let comprovantePath: string | undefined;
      let comprovanteNome: string | undefined;
      if (foto) {
        const uploaded = await uploadComprovante(delivery.id, foto);
        comprovantePath = uploaded.path;
        comprovanteNome = uploaded.nome;
      }

      await onBaixar(delivery.id, {
        status,
        ocorrencia,
        nomeRecebedor,
        dataEntrega,
        comprovantePath,
        comprovanteNome,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar a baixa.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-sm max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-xl shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-primary">Baixar Entrega</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {delivery.codigo} — NF-e {formatNfe(delivery.nfe)}
            </p>
            <p className="text-xs text-on-surface-variant">{delivery.cliente}</p>
          </div>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Desfecho</label>
          <div className="grid grid-cols-3 gap-2">
            {DESFECHOS.map(({ value, label, icon: Icon, activeClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`flex flex-col items-center gap-1 py-2.5 border-2 rounded-lg text-xs font-bold transition-colors ${
                  status === value ? activeClass : 'border-outline-variant text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider block">
            Nome Recebedor {status === 'ENTREGUE' && <span className="text-error">*</span>}
          </label>
          <input
            type="text"
            value={nomeRecebedor}
            onChange={(e) => setNomeRecebedor(e.target.value)}
            placeholder="Quem recebeu a entrega"
            className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Data</label>
          <input
            type="date"
            required
            value={dataEntrega}
            onChange={(e) => setDataEntrega(e.target.value)}
            className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider block">
            Ocorrência {status !== 'ENTREGUE' && <span className="text-error">*</span>}
          </label>
          <textarea
            rows={3}
            value={ocorrencia}
            onChange={(e) => setOcorrencia(e.target.value)}
            placeholder={status === 'ENTREGUE' ? 'Observação (opcional)' : 'Explique o motivo'}
            className="w-full p-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Foto do Comprovante</label>
          <label
            className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-lg text-sm font-bold cursor-pointer transition-colors ${
              foto ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant hover:border-primary hover:bg-primary/5 text-secondary'
            }`}
          >
            <Camera className="w-4 h-4" />
            {foto ? foto.name : 'Tirar foto'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && <p className="text-xs text-error font-semibold">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-outline text-secondary py-3 rounded-xl font-bold text-sm hover:bg-surface-container transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-primary text-on-primary py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:opacity-95 transition-all disabled:opacity-75"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
}
