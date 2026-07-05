import React, { useState } from 'react';
import { X } from 'lucide-react';
import { NewDeliveryInput } from '../../lib/deliveries';

interface NovaEntregaModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewDeliveryInput) => Promise<void>;
}

export default function NovaEntregaModal({ open, onClose, onCreate }: NovaEntregaModalProps) {
  const [remetente, setRemetente] = useState('');
  const [remetenteCnpj, setRemetenteCnpj] = useState('');
  const [nfe, setNfe] = useState('');
  const [cliente, setCliente] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');
  const [valor, setValor] = useState('');
  const [endereco, setEndereco] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setRemetente('');
    setRemetenteCnpj('');
    setNfe('');
    setCliente('');
    setRazaoSocial('');
    setCnpjCpf('');
    setCidade('');
    setUf('SP');
    setValor('');
    setEndereco('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfe || !cliente || !remetente || !remetenteCnpj) {
      alert('Por favor, preencha Remetente, CNPJ do Remetente, NF-e e o Nome do Cliente.');
      return;
    }

    const randomIdNumber = Math.floor(1000 + Math.random() * 9000);
    const valorNumerico = Number(valor) || 1200.0;

    const newDel: NewDeliveryInput = {
      codigo: `#HM-${randomIdNumber}`,
      nfe,
      pedido: '',
      remetente,
      remetenteCnpj,
      remetenteEndereco: '',
      remetenteNumero: '',
      remetenteComplemento: '',
      remetenteBairro: '',
      remetenteCep: '',
      remetenteMunicipio: '',
      remetenteUf: '',
      cliente,
      nomeRazaoSocial: razaoSocial || `${cliente} S.A.`,
      cnpjCpf: cnpjCpf || '00.000.000/0001-00',
      dataPedido: new Date().toISOString().split('T')[0],
      dataExpedicao: new Date().toISOString().split('T')[0],
      previsao: new Date().toISOString().split('T')[0],
      dataEntrega: '',
      enderecoCompleto: endereco || 'Rua das Logísticas, 1000',
      numero: '',
      complemento: '',
      bairroDistrito: 'Distrito Industrial',
      cep: '04500-100',
      municipio: cidade || 'São Paulo',
      uf,
      foneFax: '(11) 99999-8888',
      status: 'EM ROTA',
      ocorrencia: 'Nenhuma',
      atrasoResponsabilidade: 'proprio',
      valorCobranca: valorNumerico,
      valorPagamento: valorNumerico * 0.65,
      codigoRastreio: `HB2024TX${randomIdNumber}`,
      chaveAcessoNfe: '',
      valorTotalNota: 0,
      comprovantePath: '',
      comprovanteNome: '',
      melhorEnvioId: '',
      melhorEnvioLastSyncAt: '',
    };

    setIsSubmitting(true);
    try {
      await onCreate(newDel);
      resetForm();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível criar a entrega: ${err.message}` : 'Não foi possível criar a entrega.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>
        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md">
            <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
              <div className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-base font-bold text-primary" id="slide-over-title">Nova Entrega</h2>
                  <div className="ml-3 flex h-7 items-center">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={onClose}
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 flex-1 px-4 sm:px-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 pb-3 border-b border-outline-variant/30">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface block">Remetente (contratante do frete)</label>
                      <input
                        type="text"
                        required
                        value={remetente}
                        onChange={(e) => setRemetente(e.target.value)}
                        placeholder="Ex: WLOGIS Cliente Ltda"
                        className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface block">CNPJ do Remetente</label>
                      <input
                        type="text"
                        required
                        value={remetenteCnpj}
                        onChange={(e) => setRemetenteCnpj(e.target.value)}
                        placeholder="Ex: 11.111.111/0001-11"
                        className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <p className="col-span-2 text-[11px] text-on-surface-variant">
                      Precisa bater com o documento cadastrado na conta do cliente para ele conseguir ver esta entrega.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-on-surface block">NF-e (Nota Fiscal)</label>
                    <input
                      type="text"
                      required
                      value={nfe}
                      onChange={(e) => setNfe(e.target.value)}
                      placeholder="Ex: 112983-01"
                      className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-on-surface block">Nome do Cliente</label>
                    <input
                      type="text"
                      required
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      placeholder="Ex: Tech Global Solutions"
                      className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-on-surface block">Razão Social Completa (Opcional)</label>
                    <input
                      type="text"
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      placeholder="Ex: Tech Global Solutions LTDA"
                      className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface block">CNPJ / CPF</label>
                      <input
                        type="text"
                        value={cnpjCpf}
                        onChange={(e) => setCnpjCpf(e.target.value)}
                        placeholder="Ex: 12.345.678/0001-90"
                        className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface block">Valor Cobrança (R$)</label>
                      <input
                        type="number"
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        placeholder="Ex: 1250"
                        className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-on-surface block">Cidade</label>
                      <input
                        type="text"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Ex: São Paulo"
                        className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-on-surface block">UF</label>
                      <select
                        value={uf}
                        onChange={(e) => setUf(e.target.value)}
                        className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="SP">SP</option>
                        <option value="RJ">RJ</option>
                        <option value="MG">MG</option>
                        <option value="PR">PR</option>
                        <option value="SC">SC</option>
                        <option value="AM">AM</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-on-surface block">Endereço Completo</label>
                    <textarea
                      rows={2}
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Av. Paulista, 1000 - Bela Vista"
                      className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-container transition-all disabled:opacity-75"
                  >
                    {isSubmitting ? 'Registrando...' : 'Registrar Entrega'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
