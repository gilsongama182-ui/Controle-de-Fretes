import React, { useState } from 'react';
import { FileUp, X, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { NewDeliveryInput } from '../../lib/deliveries';
import { parseDeliveriesCsv, downloadCsvTemplate, ParsedRow } from '../../lib/importCsv';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (inputs: NewDeliveryInput[]) => Promise<void>;
}

export default function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  if (!open) return null;

  const reset = () => {
    setFileName('');
    setRows([]);
    setDragActive(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const readFile = (file: File) => {
    if (!/\.csv$/i.test(file.name)) {
      alert('Por favor, selecione um arquivo .csv (baixe o modelo abaixo se precisar do formato certo).');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setRows(parseDeliveriesCsv(text));
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) readFile(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) readFile(e.target.files[0]);
    e.target.value = '';
  };

  const validRows = rows.filter((r) => r.data !== null);
  const invalidRows = rows.filter((r) => r.data === null);

  const handleConfirmImport = async () => {
    const inputs = validRows.map((r) => r.data as NewDeliveryInput);
    if (inputs.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(inputs);
      alert(`${inputs.length} entrega(s) importada(s) com sucesso!`);
      handleClose();
    } catch (err) {
      alert(err instanceof Error ? `Falha ao importar: ${err.message}` : 'Falha ao importar planilha.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose}></div>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10 border border-outline-variant max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-outline-variant pb-3">
          <h3 className="text-base font-bold text-primary flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" />
            <span>Importar Planilha de Manifestos</span>
          </h3>
          <button onClick={handleClose} className="text-outline hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => downloadCsvTemplate('modelo-importacao-wlogis.csv')}
          className="mt-4 flex items-center gap-2 text-xs font-bold text-secondary hover:underline"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Baixar modelo CSV (com as colunas certas)</span>
        </button>

        <div className="my-4">
          <label
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive ? 'border-primary bg-primary/5' : 'border-outline-variant hover:bg-surface-container-low'
            }`}
          >
            <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
            <FileUp className="w-12 h-12 text-outline mb-3" />
            <p className="text-sm font-semibold text-on-surface">Arraste e solte seu arquivo (.csv)</p>
            <p className="text-xs text-outline mt-1">ou clique para selecionar do seu computador</p>
            {fileName && <p className="text-xs font-bold text-primary mt-3">{fileName}</p>}
          </label>
        </div>

        {rows.length > 0 && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-on-tertiary-container">
                <CheckCircle className="w-4 h-4" />
                {validRows.length} válida(s)
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1.5 text-error">
                  <AlertTriangle className="w-4 h-4" />
                  {invalidRows.length} com erro
                </span>
              )}
            </div>

            {invalidRows.length > 0 && (
              <div className="bg-error-container/20 border border-error/30 rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                {invalidRows.map((r) => (
                  <p key={r.line} className="text-[11px] text-error">
                    Linha {r.line}: {r.errors.join('; ')}
                  </p>
                ))}
              </div>
            )}

            {validRows.length > 0 && (
              <div className="border border-outline-variant rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Remetente</th>
                      <th className="px-3 py-2">Destinatário</th>
                      <th className="px-3 py-2">UF</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {validRows.slice(0, 5).map((r) => (
                      <tr key={r.line}>
                        <td className="px-3 py-2">{r.data!.remetente}</td>
                        <td className="px-3 py-2">{r.data!.nomeRazaoSocial}</td>
                        <td className="px-3 py-2">{r.data!.uf}</td>
                        <td className="px-3 py-2">{r.data!.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validRows.length > 5 && (
                  <p className="text-[11px] text-on-surface-variant text-center py-2 bg-surface-container-low">
                    + {validRows.length - 5} outra(s) entrega(s)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-outline-variant pt-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-outline-variant text-secondary rounded-lg font-bold text-xs hover:bg-surface-container"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={validRows.length === 0 || isImporting}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-xs hover:brightness-110 disabled:opacity-50"
          >
            {isImporting ? 'Importando...' : `Importar ${validRows.length || ''} entrega(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
