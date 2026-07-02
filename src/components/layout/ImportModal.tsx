import React, { useState } from 'react';
import { FileUp, X, CheckCircle } from 'lucide-react';
import { NewDeliveryInput } from '../../lib/deliveries';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (input: NewDeliveryInput) => Promise<void>;
}

// Importação real de planilha (.xlsx/.csv) está fora do escopo atual;
// este fluxo simula o resultado (1 registro novo) para exercitar a UI e persistir via Supabase.
function buildMockImportedDelivery(): NewDeliveryInput {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return {
    codigo: `#HM-${randomNum}`,
    nfe: `112.${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}`,
    cliente: 'Importado Sul Ltda',
    nomeRazaoSocial: 'Importadora Sul Brasileira LTDA',
    cnpjCpf: '12.000.111/0001-22',
    dataPedido: new Date().toISOString().split('T')[0],
    dataExpedicao: new Date().toISOString().split('T')[0],
    previsao: 'A definir',
    enderecoCompleto: 'Av. Beira Rio, 99',
    bairroDistrito: 'Porto',
    cep: '90000-000',
    municipio: 'Porto Alegre',
    uf: 'RS',
    foneFax: '(51) 3222-1111',
    status: 'EM ROTA',
    ocorrencia: 'Importado via planilha',
    valorCobranca: 2500.0,
    valorPagamento: 1600.0,
    codigoRastreio: `HB2024TX${randomNum}`,
  };
}

export default function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  const runImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      await onImport(buildMockImportedDelivery());
      setImporting(false);
      onClose();
      alert('Planilha importada com sucesso! 1 nova entrega adicionada.');
    } catch (err) {
      setImporting(false);
      alert(err instanceof Error ? `Falha ao importar: ${err.message}` : 'Falha ao importar planilha.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      runImport();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 z-10 border border-outline-variant">
        <div className="flex justify-between items-center border-b border-outline-variant pb-3">
          <h3 className="text-base font-bold text-primary flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" />
            <span>Importar Planilha de Manifestos</span>
          </h3>
          <button onClick={onClose} className="text-outline hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-6">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={runImport}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive ? 'border-primary bg-primary/5' : 'border-outline-variant hover:bg-surface-container-low'
            }`}
          >
            <FileUp className="w-12 h-12 text-outline mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-on-surface">Arraste e solte seu arquivo de manifestos (.xlsx, .csv)</p>
            <p className="text-xs text-outline mt-1">ou clique para selecionar do seu computador</p>
          </div>
        </div>

        {importing && (
          <div className="text-xs text-on-tertiary-container bg-green-50 p-3 rounded-lg flex items-center gap-2 mb-4 animate-pulse">
            <CheckCircle className="w-4 h-4" />
            <span>Processando linhas e registrando manifestos...</span>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-outline-variant pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant text-secondary rounded-lg font-bold text-xs hover:bg-surface-container"
          >
            Cancelar
          </button>
          <button
            onClick={runImport}
            disabled={importing}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-xs hover:brightness-110 disabled:opacity-75"
          >
            Selecionar Arquivo
          </button>
        </div>
      </div>
    </div>
  );
}
