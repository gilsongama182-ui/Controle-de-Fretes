import { X, Printer } from 'lucide-react';
import { Delivery } from '../../types';
import { Invoice } from '../../lib/invoices';
import { formatNfe } from '../../lib/formatNfe';

interface FaturaPrintViewProps {
  invoice: Invoice;
  deliveries: Delivery[];
  onClose: () => void;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDataEmissao(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function joinNonEmpty(parts: (string | undefined)[], sep: string): string {
  return parts.filter((p) => p && p.trim() !== '').join(sep);
}

export default function FaturaPrintView({ invoice, deliveries, onClose }: FaturaPrintViewProps) {
  const primeira = deliveries[0];
  const total = deliveries.reduce((soma, d) => soma + (d.valorFreteCalculado ?? 0), 0);

  const remetenteEndereco = primeira
    ? joinNonEmpty(
        [
          joinNonEmpty([primeira.remetenteEndereco, primeira.remetenteNumero], ', ') + (primeira.remetenteComplemento ? ` - ${primeira.remetenteComplemento}` : ''),
          joinNonEmpty([primeira.remetenteBairro, primeira.remetenteCep ? `CEP ${primeira.remetenteCep}` : ''], ' - '),
          joinNonEmpty([primeira.remetenteMunicipio, primeira.remetenteUf], '/'),
        ],
        ' — ',
      )
    : '';

  return (
    <div className="fatura-print-root fixed inset-0 z-50 bg-surface-container overflow-y-auto">
      <style>{`
        .fatura-print-root { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; }
        .fatura-page {
          width: 210mm;
          min-height: 297mm;
          box-sizing: border-box;
          padding: 15mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
        }
        .fatura-topo {
          display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2pt solid #0058be; padding-bottom: 6mm; margin-bottom: 8mm;
        }
        .fatura-titulo { text-align: right; }
        .fatura-titulo h1 { font-size: 20pt; font-weight: 800; color: #0058be; margin: 0; letter-spacing: 0.5px; }
        .fatura-titulo .fatura-numero { font-size: 13pt; font-weight: 700; color: #1a1a1a; margin-top: 1mm; }
        .fatura-titulo .fatura-data { font-size: 9pt; color: #555; margin-top: 1mm; }
        .fatura-bloco {
          border: 1pt solid #d0d5dd; border-radius: 3mm; padding: 4mm 6mm; margin-bottom: 6mm;
          background: #f7f9fc;
        }
        .fatura-bloco-label { font-size: 8pt; font-weight: 800; letter-spacing: 1px; color: #0058be; margin-bottom: 1.5mm; }
        .fatura-bloco .fatura-nome { font-weight: 700; font-size: 12pt; }
        .fatura-bloco .fatura-linha { font-size: 9.5pt; color: #333; line-height: 1.4; margin-top: 0.5mm; }
        table.fatura-tabela { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
        table.fatura-tabela thead th {
          background: #0058be; color: white; font-size: 8pt; text-transform: uppercase;
          letter-spacing: 0.5px; padding: 3mm 3mm; text-align: left;
        }
        table.fatura-tabela thead th.fatura-col-valor { text-align: right; }
        table.fatura-tabela tbody td { font-size: 9.5pt; padding: 2.5mm 3mm; border-bottom: 0.5pt solid #e4e7ec; }
        table.fatura-tabela tbody td.fatura-col-valor { text-align: right; font-weight: 600; }
        table.fatura-tabela tbody tr:nth-child(even) { background: #f7f9fc; }
        .fatura-total-row { display: flex; justify-content: flex-end; gap: 4mm; padding: 3mm 3mm 0; }
        .fatura-total-label { font-size: 11pt; font-weight: 700; color: #333; }
        .fatura-total-valor { font-size: 14pt; font-weight: 800; color: #0058be; }
        .fatura-rodape { margin-top: 12mm; padding-top: 4mm; border-top: 0.5pt solid #d0d5dd; font-size: 8pt; color: #888; text-align: center; }
        @media print {
          body * { visibility: hidden; }
          .fatura-print-root, .fatura-print-root * { visibility: visible; }
          .fatura-no-print { display: none !important; }
          .fatura-print-root {
            position: absolute !important; top: 0 !important; left: 0 !important; inset: auto !important;
            overflow: visible !important; width: 100% !important; height: auto !important;
            background: white !important; padding: 0 !important;
          }
          .fatura-page { box-shadow: none !important; margin: 0 !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="fatura-no-print sticky top-0 z-10 bg-white border-b border-outline-variant p-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="font-bold text-primary text-sm">Fatura {invoice.numero}</h2>
          <p className="text-xs text-on-surface-variant">{deliveries.length} entrega(s) — salve como PDF pelo diálogo de impressão</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-all"
          >
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-secondary rounded-lg font-bold text-sm hover:bg-surface-container transition-all"
          >
            <X className="w-4 h-4" /> Fechar
          </button>
        </div>
      </div>

      <div className="py-6">
        <div className="fatura-page">
          <div className="fatura-topo">
            <img src="/logo-wlogis.png" alt="WLogis" style={{ height: '16mm', width: 'auto' }} />
            <div className="fatura-titulo">
              <h1>FATURA</h1>
              <div className="fatura-numero">Nº {invoice.numero}</div>
              <div className="fatura-data">Emitida em {formatDataEmissao(invoice.criadoEm)}</div>
            </div>
          </div>

          <div className="fatura-bloco">
            <div className="fatura-bloco-label">COBRADO DE</div>
            <div className="fatura-nome">{primeira?.remetente || '—'}</div>
            {primeira?.remetenteCnpj && <div className="fatura-linha">CNPJ {primeira.remetenteCnpj}</div>}
            {remetenteEndereco && <div className="fatura-linha">{remetenteEndereco}</div>}
          </div>

          <table className="fatura-tabela">
            <thead>
              <tr>
                <th>NF-e</th>
                <th>Destinatário</th>
                <th>Cidade / UF</th>
                <th className="fatura-col-valor">Valor</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td>{formatNfe(d.nfe)}</td>
                  <td>{d.nomeRazaoSocial}</td>
                  <td>{d.municipio}/{d.uf}</td>
                  <td className="fatura-col-valor">R$ {formatMoeda(d.valorFreteCalculado ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="fatura-total-row">
            <span className="fatura-total-label">Total da fatura:</span>
            <span className="fatura-total-valor">R$ {formatMoeda(total)}</span>
          </div>

          <div className="fatura-rodape">
            WLOGIS — Documento gerado eletronicamente, sem necessidade de assinatura.
          </div>
        </div>
      </div>
    </div>
  );
}
