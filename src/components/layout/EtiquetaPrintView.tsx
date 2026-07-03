import React from 'react';
import { X, Printer } from 'lucide-react';
import { Delivery } from '../../types';
import { encodeCode128C } from '../../lib/barcode128';
import { formatNfe } from '../../lib/formatNfe';

interface EtiquetaPrintViewProps {
  deliveries: Delivery[];
  onClose: () => void;
}

function formatChaveGroups(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function joinNonEmpty(parts: (string | undefined)[], sep: string): string {
  return parts.filter((p) => p && p.trim() !== '').join(sep);
}

function BarcodeSvg({ value }: { value: string }) {
  const result = encodeCode128C(value);
  if (!result) {
    return <div className="etiqueta-barcode-erro">Sem chave de acesso para gerar código de barras.</div>;
  }
  const { bars, totalModules } = result;
  return (
    <svg viewBox={`0 0 ${totalModules} 100`} preserveAspectRatio="none" className="etiqueta-barcode-svg">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.width} height={100} fill="#000" />
      ))}
    </svg>
  );
}

function renderEtiquetaPagina(d: Delivery) {
  const remetenteEndereco = joinNonEmpty([d.remetenteEndereco, d.remetenteNumero], ', ');
  const remetenteComplemento = d.remetenteComplemento ? ` - ${d.remetenteComplemento}` : '';
  const remetenteBairroCep = joinNonEmpty([d.remetenteBairro, d.remetenteCep ? `CEP ${d.remetenteCep}` : ''], ' - ');
  const remetenteCidadeUf = joinNonEmpty([d.remetenteMunicipio, d.remetenteUf], '/');

  const destEndereco = joinNonEmpty([d.enderecoCompleto, d.numero], ', ');
  const destComplemento = d.complemento ? ` - ${d.complemento}` : '';
  const destBairroCep = joinNonEmpty([d.bairroDistrito, d.cep ? `CEP ${d.cep}` : ''], ' - ');
  const destCidadeUf = joinNonEmpty([d.municipio, d.uf], '/');

  return (
    <div className="etiqueta-page">
      <div className="etiqueta-header">
        <div className="etiqueta-brand">WLOGIS</div>
        <div className="etiqueta-pedido-box">
          NF-e {formatNfe(d.nfe)}
          <strong>CNI / PEDIDO {d.pedido || '—'}</strong>
        </div>
      </div>

      <div className="etiqueta-box etiqueta-remetente">
        <div className="etiqueta-box-label">REMETENTE</div>
        <div className="etiqueta-nome">{d.remetente}</div>
        <div className="etiqueta-linha">CNPJ {d.remetenteCnpj}</div>
        {remetenteEndereco && <div className="etiqueta-linha">{remetenteEndereco}{remetenteComplemento}</div>}
        {(remetenteBairroCep || remetenteCidadeUf) && (
          <div className="etiqueta-linha">{joinNonEmpty([remetenteBairroCep, remetenteCidadeUf], ' — ')}</div>
        )}
      </div>

      <div className="etiqueta-box etiqueta-destinatario">
        <div className="etiqueta-box-label">DESTINATÁRIO</div>
        <div className="etiqueta-nome">{d.nomeRazaoSocial}</div>
        {destEndereco && <div className="etiqueta-linha">{destEndereco}{destComplemento}</div>}
        {destBairroCep && <div className="etiqueta-linha">{destBairroCep}</div>}
        {destCidadeUf && <div className="etiqueta-linha etiqueta-cidade">{destCidadeUf}</div>}
      </div>

      <div className="etiqueta-nf-row">
        <span>NF-e: {formatNfe(d.nfe)}</span>
        <span>CNI / PEDIDO: {d.pedido || '—'}</span>
      </div>

      <div className="etiqueta-barcode-area">
        {d.chaveAcessoNfe ? (
          <>
            <BarcodeSvg value={d.chaveAcessoNfe} />
            <div className="etiqueta-chave-texto">{formatChaveGroups(d.chaveAcessoNfe)}</div>
          </>
        ) : (
          <div className="etiqueta-barcode-erro">Sem chave de acesso para gerar código de barras.</div>
        )}
      </div>
    </div>
  );
}

export default function EtiquetaPrintView({ deliveries, onClose }: EtiquetaPrintViewProps) {
  return (
    <div className="etiqueta-print-root fixed inset-0 z-50 bg-surface-container overflow-y-auto">
      <style>{`
        .etiqueta-print-root { font-family: Arial, Helvetica, sans-serif; }
        .etiqueta-page {
          width: 100mm;
          height: 150mm;
          box-sizing: border-box;
          padding: 4mm;
          display: flex;
          flex-direction: column;
          gap: 2.5mm;
          font-size: 9pt;
          color: #111;
          margin: 0 auto;
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
        }
        .etiqueta-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1.5pt solid #111;
          padding-bottom: 2mm;
        }
        .etiqueta-brand { font-weight: 800; font-size: 13pt; letter-spacing: 0.5px; }
        .etiqueta-pedido-box { text-align: right; font-size: 8pt; line-height: 1.3; }
        .etiqueta-pedido-box strong { font-size: 10pt; display: block; }
        .etiqueta-box { border: 1pt solid #111; border-radius: 2mm; padding: 2mm 3mm; }
        .etiqueta-box-label { font-size: 7pt; font-weight: 800; letter-spacing: 1px; color: #444; margin-bottom: 1mm; }
        .etiqueta-remetente .etiqueta-nome { font-weight: 700; font-size: 9pt; }
        .etiqueta-remetente .etiqueta-linha { font-size: 8pt; color: #222; line-height: 1.35; }
        .etiqueta-destinatario { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 1.5mm; }
        .etiqueta-destinatario .etiqueta-nome { font-weight: 800; font-size: 14pt; line-height: 1.2; }
        .etiqueta-destinatario .etiqueta-linha { font-size: 11pt; line-height: 1.35; }
        .etiqueta-destinatario .etiqueta-cidade { font-weight: 700; font-size: 12pt; }
        .etiqueta-nf-row {
          display: flex; justify-content: space-between; font-size: 9pt; font-weight: 700;
          border-top: 1pt dashed #999; border-bottom: 1pt dashed #999; padding: 1.5mm 0;
        }
        .etiqueta-barcode-area { text-align: center; }
        .etiqueta-barcode-svg { width: 100%; height: 16mm; }
        .etiqueta-barcode-erro { font-size: 8pt; color: #b91c1c; padding: 4mm 0; }
        .etiqueta-chave-texto {
          font-family: 'Courier New', monospace; font-size: 7.5pt; letter-spacing: 1px;
          margin-top: 1mm; word-spacing: 3px;
        }
        @media print {
          .etiqueta-no-print { display: none !important; }
          .etiqueta-print-root { background: white !important; padding: 0 !important; }
          .etiqueta-pages { gap: 0 !important; padding: 0 !important; }
          .etiqueta-page { box-shadow: none !important; margin: 0 !important; break-after: page; }
          @page { size: 100mm 150mm; margin: 0; }
        }
      `}</style>

      <div className="etiqueta-no-print sticky top-0 z-10 bg-white border-b border-outline-variant p-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="font-bold text-primary text-sm">Etiquetas de Remessa</h2>
          <p className="text-xs text-on-surface-variant">{deliveries.length} etiqueta(s) — 10cm x 15cm cada</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-all"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-secondary rounded-lg font-bold text-sm hover:bg-surface-container transition-all"
          >
            <X className="w-4 h-4" /> Fechar
          </button>
        </div>
      </div>

      <div className="etiqueta-pages flex flex-col items-center gap-6 py-6">
        {deliveries.map((d) => (
          <div key={d.id}>{renderEtiquetaPagina(d)}</div>
        ))}
      </div>
    </div>
  );
}
