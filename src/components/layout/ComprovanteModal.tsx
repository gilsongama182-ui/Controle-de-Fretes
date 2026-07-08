import React, { useState } from 'react';
import { X, Upload, FileText, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { Delivery } from '../../types';
import { formatNfe } from '../../lib/formatNfe';
import { DeliveryComprovante, getComprovanteUrl } from '../../lib/comprovantes';
import { getErrorMessage } from '../../lib/errorMessage';

interface ComprovanteModalProps {
  delivery: Delivery | null;
  comprovantes: DeliveryComprovante[];
  onClose: () => void;
  onUpload: (deliveryId: string, file: File) => Promise<void>;
  onRemove: (id: string, path: string) => Promise<void>;
}

export default function ComprovanteModal({ delivery, comprovantes, onClose, onUpload, onRemove }: ComprovanteModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!delivery) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setError('');
    setIsUploading(true);
    try {
      for (const file of files) {
        await onUpload(delivery.id, file);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível enviar o comprovante.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = async (comprovante: DeliveryComprovante) => {
    setError('');
    setOpeningId(comprovante.id);
    try {
      const url = await getComprovanteUrl(comprovante.arquivoPath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível abrir o comprovante.'));
    } finally {
      setOpeningId(null);
    }
  };

  const handleRemove = async (comprovante: DeliveryComprovante) => {
    if (!confirm('Remover este comprovante de entrega?')) return;
    setError('');
    setRemovingId(comprovante.id);
    try {
      await onRemove(comprovante.id, comprovante.arquivoPath);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível remover o comprovante.'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-primary">Comprovante de Entrega</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              NF-e {formatNfe(delivery.nfe)} — {delivery.cliente}
            </p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        {comprovantes.length > 0 ? (
          <div className="space-y-2">
            {comprovantes.map((comprovante) => (
              <div
                key={comprovante.id}
                className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant"
              >
                <FileText className="w-8 h-8 text-secondary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-on-surface truncate" title={comprovante.arquivoNome}>
                    {comprovante.arquivoNome}
                  </p>
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={() => handleView(comprovante)}
                      disabled={openingId === comprovante.id}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-60"
                    >
                      <ExternalLink className="w-3 h-3" /> {openingId === comprovante.id ? 'Abrindo...' : 'Ver arquivo'}
                    </button>
                    <button
                      onClick={() => handleRemove(comprovante)}
                      disabled={removingId === comprovante.id}
                      className="text-[11px] font-bold text-error hover:underline flex items-center gap-1 disabled:opacity-60"
                    >
                      <Trash2 className="w-3 h-3" /> {removingId === comprovante.id ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant">Nenhum comprovante enviado para esta entrega ainda.</p>
        )}

        <label
          className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-lg text-sm font-bold cursor-pointer transition-colors ${
            isUploading
              ? 'opacity-60 pointer-events-none border-outline-variant text-secondary'
              : 'border-outline-variant hover:border-primary hover:bg-primary/5 text-secondary'
          }`}
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isUploading ? 'Enviando...' : 'Anexar arquivo(s)'}
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
        <p className="text-[10px] text-on-surface-variant text-center">Formatos aceitos: PNG, JPEG ou PDF · até 10MB cada</p>

        {error && <p className="text-xs text-error font-semibold">{error}</p>}
      </div>
    </div>
  );
}
