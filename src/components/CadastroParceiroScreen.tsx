import { useState, useEffect } from 'react';
import { ChevronRight, ArrowLeft, Save, Loader2, ExternalLink, Trash2, Upload, FileText } from 'lucide-react';
import { ActivePage, User } from '../types';
import {
  Partner,
  PartnerType,
  PartnerStatus,
  HomologadoQualidade,
  NewPartnerInput,
  createPartner,
  updatePartner,
} from '../lib/partners';
import {
  PartnerDocument,
  fetchDocumentsForPartner,
  uploadPartnerDocument,
  getPartnerDocumentUrl,
  removePartnerDocument,
} from '../lib/partnerDocuments';
import Sidebar from './layout/Sidebar';
import OperadorTopBar from './layout/OperadorTopBar';

interface CadastroParceiroScreenProps {
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  user: User;
  partner: Partner | null;
}

const DOCUMENT_LABELS = ['CNH', 'CRLV', 'Seguro do Veículo', 'Contrato Social', 'Comprovante de Endereço', 'Alvará', 'Outro'];

const inputClass = 'w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary';
const labelClass = 'text-xs text-on-surface-variant font-medium';
const sectionTitleClass = 'text-xs font-bold text-secondary tracking-widest uppercase';
const panelClass = 'bg-white rounded-xl border border-outline-variant shadow-sm p-6 space-y-6';

export default function CadastroParceiroScreen({ onNavigate, onLogout, user, partner }: CadastroParceiroScreenProps) {
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(partner?.id ?? null);
  const [isSaving, setIsSaving] = useState(false);

  // Dados Gerais
  const [tipo, setTipo] = useState<PartnerType>(partner?.tipo ?? 'agregado');
  const [nome, setNome] = useState(partner?.nome ?? '');
  const [nomeFantasia, setNomeFantasia] = useState(partner?.nomeFantasia ?? '');
  const [cpfCnpj, setCpfCnpj] = useState(partner?.cpfCnpj ?? '');
  const [rg, setRg] = useState(partner?.rg ?? '');
  const [inscricaoEstadual, setInscricaoEstadual] = useState(partner?.inscricaoEstadual ?? '');

  // Contato
  const [telefone, setTelefone] = useState(partner?.telefone ?? '');
  const [email, setEmail] = useState(partner?.email ?? '');
  const [responsavel, setResponsavel] = useState(partner?.responsavel ?? '');

  // Endereço
  const [cep, setCep] = useState(partner?.cep ?? '');
  const [endereco, setEndereco] = useState(partner?.endereco ?? '');
  const [numero, setNumero] = useState(partner?.numero ?? '');
  const [complemento, setComplemento] = useState(partner?.complemento ?? '');
  const [bairro, setBairro] = useState(partner?.bairro ?? '');
  const [municipio, setMunicipio] = useState(partner?.municipio ?? '');
  const [uf, setUf] = useState(partner?.uf ?? '');

  // Dados Bancários
  const [banco, setBanco] = useState(partner?.banco ?? '');
  const [agencia, setAgencia] = useState(partner?.agencia ?? '');
  const [conta, setConta] = useState(partner?.conta ?? '');
  const [tipoConta, setTipoConta] = useState(partner?.tipoConta ?? '');
  const [pix, setPix] = useState(partner?.pix ?? '');

  // Específico de Agregado
  const [veiculoPlaca, setVeiculoPlaca] = useState(partner?.veiculoPlaca ?? '');
  const [veiculoTipo, setVeiculoTipo] = useState(partner?.veiculoTipo ?? '');
  const [veiculoModelo, setVeiculoModelo] = useState(partner?.veiculoModelo ?? '');
  const [veiculoAno, setVeiculoAno] = useState(partner?.veiculoAno ?? '');
  const [veiculoRenavam, setVeiculoRenavam] = useState(partner?.veiculoRenavam ?? '');
  const [capacidadePesoKg, setCapacidadePesoKg] = useState(partner?.capacidadePesoKg ?? 0);
  const [capacidadeVolumeM3, setCapacidadeVolumeM3] = useState(partner?.capacidadeVolumeM3 ?? 0);
  const [cnhNumero, setCnhNumero] = useState(partner?.cnhNumero ?? '');
  const [cnhCategoria, setCnhCategoria] = useState(partner?.cnhCategoria ?? '');
  const [cnhValidade, setCnhValidade] = useState(partner?.cnhValidade ?? '');
  const [seguroApolice, setSeguroApolice] = useState(partner?.seguroApolice ?? '');
  const [seguroValidade, setSeguroValidade] = useState(partner?.seguroValidade ?? '');

  // Específico de Parceiro
  const [segmento, setSegmento] = useState(partner?.segmento ?? '');
  const [regiaoAtuacao, setRegiaoAtuacao] = useState(partner?.regiaoAtuacao ?? '');
  const [dataInicioParceria, setDataInicioParceria] = useState(partner?.dataInicioParceria ?? '');
  const [homologadoQualidade, setHomologadoQualidade] = useState<HomologadoQualidade>(partner?.homologadoQualidade ?? '');

  // Controle
  const [status, setStatus] = useState<PartnerStatus>(partner?.status ?? 'ativo');
  const [observacoes, setObservacoes] = useState(partner?.observacoes ?? '');

  // Documentos
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [docLabel, setDocLabel] = useState(DOCUMENT_LABELS[0]);
  const [docLabelCustom, setDocLabelCustom] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docError, setDocError] = useState('');
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [removingDocId, setRemovingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentPartnerId) return;
    fetchDocumentsForPartner(currentPartnerId)
      .then(setDocuments)
      .catch((err) => console.error('Falha ao buscar documentos:', err));
  }, [currentPartnerId]);

  const buildInput = (): NewPartnerInput => ({
    tipo,
    nome,
    nomeFantasia,
    cpfCnpj,
    rg,
    inscricaoEstadual,
    telefone,
    email,
    responsavel,
    cep,
    endereco,
    numero,
    complemento,
    bairro,
    municipio,
    uf,
    banco,
    agencia,
    conta,
    tipoConta,
    pix,
    veiculoPlaca,
    veiculoTipo,
    veiculoModelo,
    veiculoAno,
    veiculoRenavam,
    capacidadePesoKg,
    capacidadeVolumeM3,
    cnhNumero,
    cnhCategoria,
    cnhValidade,
    seguroApolice,
    seguroValidade,
    segmento,
    regiaoAtuacao,
    dataInicioParceria,
    homologadoQualidade,
    status,
    observacoes,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currentPartnerId) {
        await updatePartner(currentPartnerId, buildInput());
      } else {
        const created = await createPartner(buildInput());
        setCurrentPartnerId(created.id);
      }
      alert('Cadastro salvo com sucesso!');
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível salvar: ${err.message}` : 'Não foi possível salvar o cadastro.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentPartnerId) return;

    const rotulo = docLabel === 'Outro' ? docLabelCustom.trim() : docLabel;
    if (!rotulo) {
      setDocError('Informe o nome do documento antes de anexar.');
      return;
    }

    setDocError('');
    setIsUploadingDoc(true);
    try {
      const doc = await uploadPartnerDocument(currentPartnerId, rotulo, file);
      setDocuments((prev) => [...prev, doc]);
      setDocLabelCustom('');
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Não foi possível anexar o documento.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleViewDocument = async (doc: PartnerDocument) => {
    setOpeningDocId(doc.id);
    try {
      const url = await getPartnerDocumentUrl(doc.arquivoPath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível abrir o documento: ${err.message}` : 'Não foi possível abrir o documento.');
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleRemoveDocument = async (doc: PartnerDocument) => {
    if (!confirm(`Remover o documento "${doc.rotulo}"?`)) return;
    setRemovingDocId(doc.id);
    try {
      await removePartnerDocument(doc.id, doc.arquivoPath);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      alert(err instanceof Error ? `Não foi possível remover: ${err.message}` : 'Não foi possível remover o documento.');
    } finally {
      setRemovingDocId(null);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col md:flex-row">
      <Sidebar
        activePage="parceiros"
        onNavigate={onNavigate}
        onNovaEntrega={() => {}}
        onImportar={() => {}}
        onLogout={onLogout}
        onUsuarios={user.profileType === 'master' ? () => onNavigate('usuarios') : undefined}
        onIntegracoes={user.profileType === 'master' ? () => onNavigate('integracoes') : undefined}
        onCubagem={user.profileType === 'master' ? () => onNavigate('cubagem') : undefined}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <OperadorTopBar profile={user} />

        <main className="flex-1 p-6 w-full max-w-4xl mx-auto overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center text-on-surface-variant gap-2 text-xs mb-2">
                <button onClick={() => onNavigate('parceiros')} className="hover:text-primary transition-colors">
                  Agregados e Parceiros
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-outline" />
                <span className="text-primary font-bold">{currentPartnerId ? 'Editar Cadastro' : 'Novo Cadastro'}</span>
              </div>
              <h1 className="font-headline text-3xl font-bold text-primary">
                {currentPartnerId ? 'Editar Cadastro' : 'Novo Cadastro'}
              </h1>
            </div>

            <button
              onClick={() => onNavigate('parceiros')}
              className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface-variant rounded-lg font-bold text-xs hover:bg-surface-container transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Lista</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">

            {/* Dados Gerais */}
            <div className={panelClass}>
              <h2 className={sectionTitleClass}>Dados Gerais</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Tipo</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value as PartnerType)} className={inputClass}>
                    <option value="agregado">Agregado</option>
                    <option value="parceiro">Parceiro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Nome / Razão Social</label>
                  <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Nome Fantasia</label>
                  <input type="text" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>CPF / CNPJ</label>
                  <input type="text" required value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} className={`${inputClass} font-mono`} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>RG</label>
                  <input type="text" value={rg} onChange={(e) => setRg(e.target.value)} className={`${inputClass} font-mono`} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Inscrição Estadual</label>
                  <input type="text" value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} className={`${inputClass} font-mono`} />
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className={panelClass}>
              <h2 className={sectionTitleClass}>Contato</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Telefone / WhatsApp</label>
                  <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>E-mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Responsável</label>
                  <input type="text" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className={panelClass}>
              <h2 className={sectionTitleClass}>Endereço</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>CEP</label>
                  <input type="text" value={cep} onChange={(e) => setCep(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className={labelClass}>Endereço</label>
                  <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Número</label>
                  <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Complemento</label>
                  <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Bairro</label>
                  <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Município</label>
                  <input type="text" value={municipio} onChange={(e) => setMunicipio(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>UF</label>
                  <input type="text" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Dados Bancários */}
            <div className={panelClass}>
              <h2 className={sectionTitleClass}>Dados Bancários</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Banco</label>
                  <input type="text" value={banco} onChange={(e) => setBanco(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Agência</label>
                  <input type="text" value={agencia} onChange={(e) => setAgencia(e.target.value)} className={`${inputClass} font-mono`} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Conta</label>
                  <input type="text" value={conta} onChange={(e) => setConta(e.target.value)} className={`${inputClass} font-mono`} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Tipo de Conta</label>
                  <input type="text" value={tipoConta} onChange={(e) => setTipoConta(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className={labelClass}>Chave PIX</label>
                  <input type="text" value={pix} onChange={(e) => setPix(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Específico de Agregado */}
            {tipo === 'agregado' && (
              <div className={panelClass}>
                <h2 className={sectionTitleClass}>Veículo e Motorista (Agregado)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Placa do Veículo</label>
                    <input type="text" value={veiculoPlaca} onChange={(e) => setVeiculoPlaca(e.target.value.toUpperCase())} className={`${inputClass} font-mono`} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Tipo de Veículo</label>
                    <input type="text" placeholder="Van, VUC, Toco, Truck, Carreta..." value={veiculoTipo} onChange={(e) => setVeiculoTipo(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Modelo / Marca</label>
                    <input type="text" value={veiculoModelo} onChange={(e) => setVeiculoModelo(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Ano</label>
                    <input type="text" value={veiculoAno} onChange={(e) => setVeiculoAno(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Renavam</label>
                    <input type="text" value={veiculoRenavam} onChange={(e) => setVeiculoRenavam(e.target.value)} className={`${inputClass} font-mono`} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Capacidade de Carga (kg)</label>
                    <input type="number" step="0.01" min="0" value={capacidadePesoKg} onChange={(e) => setCapacidadePesoKg(Math.max(0, Number(e.target.value) || 0))} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Cubagem (m³)</label>
                    <input type="number" step="0.01" min="0" value={capacidadeVolumeM3} onChange={(e) => setCapacidadeVolumeM3(Math.max(0, Number(e.target.value) || 0))} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>CNH — Número</label>
                    <input type="text" value={cnhNumero} onChange={(e) => setCnhNumero(e.target.value)} className={`${inputClass} font-mono`} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>CNH — Categoria</label>
                    <input type="text" value={cnhCategoria} onChange={(e) => setCnhCategoria(e.target.value.toUpperCase())} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>CNH — Validade</label>
                    <input type="date" value={cnhValidade} onChange={(e) => setCnhValidade(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Seguro — Apólice</label>
                    <input type="text" value={seguroApolice} onChange={(e) => setSeguroApolice(e.target.value)} className={`${inputClass} font-mono`} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Seguro — Validade</label>
                    <input type="date" value={seguroValidade} onChange={(e) => setSeguroValidade(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Específico de Parceiro */}
            {tipo === 'parceiro' && (
              <div className={panelClass}>
                <h2 className={sectionTitleClass}>Dados da Empresa Parceira</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Segmento / Serviço Prestado</label>
                    <input type="text" value={segmento} onChange={(e) => setSegmento(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Região(ões) / UF de Atuação</label>
                    <input type="text" value={regiaoAtuacao} onChange={(e) => setRegiaoAtuacao(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Data de Início da Parceria</label>
                    <input type="date" value={dataInicioParceria} onChange={(e) => setDataInicioParceria(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Homologado pela Qualidade</label>
                    <select value={homologadoQualidade} onChange={(e) => setHomologadoQualidade(e.target.value as HomologadoQualidade)} className={inputClass}>
                      <option value="">— Selecione —</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Controle */}
            <div className={panelClass}>
              <h2 className={sectionTitleClass}>Controle</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as PartnerStatus)} className={inputClass}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                {partner?.createdAt && (
                  <div className="space-y-1">
                    <label className={labelClass}>Data de Cadastro</label>
                    <p className="p-2.5 text-sm text-on-surface-variant">
                      {new Date(partner.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                <div className="space-y-1 sm:col-span-2">
                  <label className={labelClass}>Observações</label>
                  <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Documentos */}
            <div className={panelClass}>
              <h2 className={sectionTitleClass}>Documentos</h2>

              {!currentPartnerId ? (
                <p className="text-sm text-on-surface-variant">Salve os dados acima antes de anexar documentos.</p>
              ) : (
                <>
                  {documents.length > 0 && (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                          <FileText className="w-6 h-6 text-secondary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-on-surface">{doc.rotulo}</p>
                            <p className="text-xs text-on-surface-variant truncate" title={doc.arquivoNome}>{doc.arquivoNome}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleViewDocument(doc)}
                            disabled={openingDocId === doc.id}
                            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-60 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" /> {openingDocId === doc.id ? 'Abrindo...' : 'Ver'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc)}
                            disabled={removingDocId === doc.id}
                            className="text-[11px] font-bold text-error hover:underline flex items-center gap-1 disabled:opacity-60 shrink-0"
                          >
                            <Trash2 className="w-3 h-3" /> {removingDocId === doc.id ? 'Removendo...' : 'Remover'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end pt-2 border-t border-outline-variant">
                    <div className="space-y-1 w-full sm:w-48">
                      <label className={labelClass}>Rótulo</label>
                      <select value={docLabel} onChange={(e) => setDocLabel(e.target.value)} className={inputClass}>
                        {DOCUMENT_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    {docLabel === 'Outro' && (
                      <div className="space-y-1 w-full sm:w-48">
                        <label className={labelClass}>Descrição</label>
                        <input type="text" value={docLabelCustom} onChange={(e) => setDocLabelCustom(e.target.value)} className={inputClass} />
                      </div>
                    )}
                    <label className={`flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                      isUploadingDoc ? 'opacity-60 pointer-events-none border-outline-variant text-secondary' : 'border-outline-variant hover:border-primary hover:bg-primary/5 text-secondary'
                    }`}>
                      {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {isUploadingDoc ? 'Enviando...' : 'Anexar Arquivo'}
                      <input type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" className="hidden" onChange={handleUploadDocument} disabled={isUploadingDoc} />
                    </label>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">Formatos aceitos: PNG, JPEG ou PDF · até 10MB</p>
                  {docError && <p className="text-xs text-error font-semibold">{docError}</p>}
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-primary text-on-primary py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold hover:opacity-95 transition-all shadow-md text-sm disabled:opacity-75"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Salvando...' : 'Salvar Cadastro'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('parceiros')}
                className="border border-outline text-secondary py-3 px-6 rounded-xl font-bold hover:bg-surface-container transition-all text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
