import { X, Printer } from 'lucide-react';
import { Delivery } from '../../types';
import { Invoice } from '../../lib/invoices';
import { formatNfe } from '../../lib/formatNfe';
import { calcularFrete, STATUS_DEVOLUCAO } from '../../lib/freightCalc';
import { Volume } from '../../lib/deliveryVolumes';
import { FreightRate } from '../../lib/freightRates';

interface FaturaPrintViewProps {
  invoice: Invoice;
  deliveries: Delivery[];
  volumesByDeliveryId: Map<string, Volume[]>;
  freightRates: FreightRate[];
  onClose: () => void;
}

const EMPTY_VOLUMES: Volume[] = [];

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

export default function FaturaPrintView({ invoice, deliveries, volumesByDeliveryId, freightRates, onClose }: FaturaPrintViewProps) {
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
          width: 297mm;
          min-height: 210mm;
          box-sizing: border-box;
          padding: 12mm 15mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
        }
        .fatura-topo {
          display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2pt solid #0058be; padding-bottom: 5mm; margin-bottom: 6mm;
        }
        .fatura-titulo { text-align: right; }
        .fatura-titulo h1 { font-size: 18pt; font-weight: 800; color: #0058be; margin: 0; letter-spacing: 0.5px; }
        .fatura-titulo .fatura-numero { font-size: 12pt; font-weight: 700; color: #1a1a1a; margin-top: 1mm; }
        .fatura-titulo .fatura-data { font-size: 8.5pt; color: #555; margin-top: 1mm; }
        .fatura-bloco {
          border: 1pt solid #d0d5dd; border-radius: 3mm; padding: 3.5mm 6mm; margin-bottom: 5mm;
          background: #f7f9fc;
        }
        .fatura-bloco-label { font-size: 7.5pt; font-weight: 800; letter-spacing: 1px; color: #0058be; margin-bottom: 1.5mm; }
        .fatura-bloco .fatura-nome { font-weight: 700; font-size: 11pt; }
        .fatura-bloco .fatura-linha { font-size: 9pt; color: #333; line-height: 1.4; margin-top: 0.5mm; }
        table.fatura-tabela { width: 100%; border-collapse: collapse; margin-bottom: 5mm; }
        table.fatura-tabela thead th {
          background: #0058be; color: white; font-size: 7pt; text-transform: uppercase;
          letter-spacing: 0.4px; padding: 2.5mm 2mm; text-align: left; white-space: nowrap;
        }
        table.fatura-tabela thead th.fatura-col-valor { text-align: right; }
        table.fatura-tabela tbody td { font-size: 8pt; padding: 2mm; border-bottom: 0.5pt solid #e4e7ec; white-space: nowrap; }
        table.fatura-tabela tbody td.fatura-col-valor { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
        table.fatura-tabela tbody td.fatura-col-obs { white-space: normal; font-size: 7pt; }
        table.fatura-tabela tbody td.fatura-col-total { text-align: right; font-weight: 800; color: #0058be; }
        .fatura-tag-acrescimo { display: inline-block; margin-right: 2mm; font-size: 6.5pt; font-weight: 800; text-transform: uppercase; color: #b45309; letter-spacing: 0.3px; }
        table.fatura-tabela tbody tr:nth-child(even) { background: #f7f9fc; }
        .fatura-total-row { display: flex; justify-content: flex-end; gap: 4mm; padding: 3mm 3mm 0; }
        .fatura-total-label { font-size: 11pt; font-weight: 700; color: #333; }
        .fatura-total-valor { font-size: 14pt; font-weight: 800; color: #0058be; }
        .fatura-rodape { margin-top: 8mm; padding-top: 3mm; border-top: 0.5pt solid #d0d5dd; font-size: 7.5pt; color: #888; text-align: center; }
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
          @page { size: A4 landscape; margin: 0; }
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
            <img src="/logo-wlogis.png" alt="WLogis" style={{ height: '14mm', width: 'auto' }} />
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
                <th className="fatura-col-valor">Valor NF</th>
                <th className="fatura-col-valor">Peso Consid.</th>
                <th className="fatura-col-valor">Frete Base</th>
                <th className="fatura-col-valor">GRIS</th>
                <th className="fatura-col-valor">Ad Valorem</th>
                <th className="fatura-col-valor">ICMS</th>
                <th className="fatura-col-valor">Total</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => {
                // Recalculado pra exibir a composição (frete base/GRIS/Ad
                // Valorem/ICMS) — o Total em si vem sempre do valor congelado
                // na hora de gerar a fatura (d.valorFreteCalculado), nunca
                // recalculado, mesmo que a tabela de frete mude depois.
                const calc = calcularFrete(d, volumesByDeliveryId.get(d.id) ?? EMPTY_VOLUMES, freightRates);
                const temReentrega = d.reentrega;
                const temDevolucao = STATUS_DEVOLUCAO.includes(d.status);
                const temAcordado = d.valorAcordado != null;
                return (
                  <tr key={d.id}>
                    <td>{formatNfe(d.nfe)}</td>
                    <td>{d.nomeRazaoSocial}</td>
                    <td>{d.municipio}/{d.uf}</td>
                    <td className="fatura-col-valor">R$ {formatMoeda(d.valorTotalNota || 0)}</td>
                    <td className="fatura-col-valor">{calc.pesoConsiderado.toFixed(2)} kg</td>
                    <td className="fatura-col-valor">R$ {formatMoeda(calc.valorBase)}</td>
                    <td className="fatura-col-valor">R$ {formatMoeda(calc.gris)}</td>
                    <td className="fatura-col-valor">R$ {formatMoeda(calc.adValorem)}</td>
                    <td className="fatura-col-valor">R$ {formatMoeda(calc.icms)}</td>
                    <td className="fatura-col-total">R$ {formatMoeda(d.valorFreteCalculado ?? 0)}</td>
                    <td className="fatura-col-obs">
                      {temAcordado && <span className="fatura-tag-acrescimo">Valor negociado</span>}
                      {temReentrega && <span className="fatura-tag-acrescimo">+ Reentrega</span>}
                      {temDevolucao && <span className="fatura-tag-acrescimo">+ Devolução</span>}
                      {!temAcordado && !temReentrega && !temDevolucao && '—'}
                    </td>
                  </tr>
                );
              })}
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
