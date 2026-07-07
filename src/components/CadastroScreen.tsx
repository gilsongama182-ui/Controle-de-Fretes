import React, { useState } from 'react';
import { User as UserIcon, Shield, Lock, Eye, EyeOff, Mail, ArrowRight, Truck, AlertCircle, MailCheck } from 'lucide-react';
import { ActivePage, Genero } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface CadastroScreenProps {
  onNavigate: (page: ActivePage) => void;
}

export default function CadastroScreen({ onNavigate }: CadastroScreenProps) {
  const { signUp } = useAuth();
  const [profileType, setProfileType] = useState<'cliente' | 'operador'>('cliente');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [genero, setGenero] = useState<Genero>('nao_informado');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // true quando o cadastro deu certo mas o projeto exige confirmação por
  // e-mail — sem isso, o usuário ficava sem nenhum feedback, achando que já
  // podia logar, e caía em "e-mail ou senha incorretos" na tentativa.
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!agreeTerms) {
      setErrorMessage('Você precisa aceitar os Termos de Serviço e Políticas de Privacidade.');
      return;
    }

    setIsSubmitting(true);
    const { error, needsEmailConfirmation } = await signUp(email, password, {
      name,
      profileType,
      document: document || (profileType === 'operador' ? '00.000.000/0001-00' : '000.000.000-00'),
      genero,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    if (needsEmailConfirmation) {
      setConfirmationSent(true);
      return;
    }
    // Sem exigência de confirmação, o App.tsx redireciona automaticamente
    // com base na sessão + perfil restaurados pelo AuthContext.
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
      {/* Header / Brand */}
      <header className="mb-8 text-center max-w-[640px] w-full flex flex-col items-center">
        <img src="/logo-wlogis.png" alt="WLogis" className="h-14 w-auto mb-4" />
        <h1 className="font-headline text-3xl font-semibold text-primary tracking-tight mb-2">
          Acompanhamento Entregas
        </h1>
        <p className="font-sans text-sm text-secondary">
          Crie sua conta para acessar o ecossistema logístico.
        </p>
      </header>

      {/* Main Registration Card */}
      <main className="w-full max-w-[640px] bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        {confirmationSent ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <MailCheck className="w-6 h-6 text-green-700" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Confirme seu e-mail</h2>
            <p className="text-sm text-on-surface-variant">
              Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele antes de fazer login — sem
              essa confirmação, o sistema não libera o acesso mesmo com o cadastro aprovado.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full bg-primary text-on-primary text-sm font-semibold py-3 rounded-lg hover:bg-primary-container transition-all"
            >
              Ir para o login
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-error-container/20 border border-error/30 px-3 py-2 text-xs font-semibold text-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Profile Selection */}
          <section>
            <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-4">
              Selecione seu perfil
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Cliente Profile */}
              <label className="relative cursor-pointer block group">
                <input
                  type="radio"
                  name="profile_type"
                  checked={profileType === 'cliente'}
                  onChange={() => setProfileType('cliente')}
                  className="sr-only"
                />
                <div className={`h-full p-4 border-2 rounded-xl transition-all duration-200 hover:border-outline ${
                  profileType === 'cliente'
                    ? 'border-primary bg-secondary-container/30'
                    : 'border-surface-container-high bg-surface-container-lowest'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      profileType === 'cliente'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-primary">Sou um Cliente</h3>
                      <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                        Acompanhamento de entregas e status em tempo real.
                      </p>
                    </div>
                  </div>
                </div>
              </label>

              {/* Operador Profile */}
              <label className="relative cursor-pointer block group">
                <input
                  type="radio"
                  name="profile_type"
                  checked={profileType === 'operador'}
                  onChange={() => setProfileType('operador')}
                  className="sr-only"
                />
                <div className={`h-full p-4 border-2 rounded-xl transition-all duration-200 hover:border-outline ${
                  profileType === 'operador'
                    ? 'border-primary bg-secondary-container/30'
                    : 'border-surface-container-high bg-surface-container-lowest'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      profileType === 'operador'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-primary">Sou um Operador</h3>
                      <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                        Gestão de frotas, rotas e importação de manifestos.
                      </p>
                    </div>
                  </div>
                </div>
              </label>

            </div>
          </section>

          {/* Section 2: Form Fields */}
          <section className="space-y-4 pt-2 border-t border-outline-variant/30">
            <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-4">
              Informações de Acesso
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface block" htmlFor="name">
                  Nome Completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-outline">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface block" htmlFor="email">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-outline">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Document (CPF / CNPJ) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface block" htmlFor="document">
                  {profileType === 'operador' ? 'CNPJ da Empresa' : 'CNPJ/CPF'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-outline">
                    <Shield className="w-4 h-4" />
                  </span>
                  <input
                    id="document"
                    type="text"
                    required
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder={profileType === 'operador' ? '00.000.000/0001-00' : '00.000.000/0000-00'}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface block" htmlFor="password">
                  Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-outline">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Gênero (usado só pra escolher o avatar) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface block" htmlFor="genero">
                  Gênero (para o avatar)
                </label>
                <select
                  id="genero"
                  value={genero}
                  onChange={(e) => setGenero(e.target.value as Genero)}
                  className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm outline-none transition-all cursor-pointer"
                >
                  <option value="nao_informado">Prefiro não informar</option>
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                </select>
              </div>

            </div>
          </section>

          {/* Terms and Submit */}
          <footer className="pt-2 space-y-4 border-t border-outline-variant/30">
            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
              />
              <label className="text-xs text-on-surface-variant cursor-pointer select-none leading-normal" htmlFor="terms">
                Ao criar uma conta, você concorda com nossos{' '}
                <a className="text-primary font-semibold hover:underline" href="#terms">
                  Termos de Serviço
                </a>{' '}
                e{' '}
                <a className="text-primary font-semibold hover:underline" href="#privacy">
                  Políticas de Privacidade
                </a>
                .
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-white font-sans text-sm font-semibold rounded-lg hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md disabled:opacity-75"
            >
              <span>{isSubmitting ? 'Processando...' : 'Criar Conta'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>

            <p className="text-center text-sm text-secondary">
              Já possui uma conta?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-primary font-bold hover:underline"
              >
                Fazer Login
              </button>
            </p>
          </footer>

        </form>
        )}
      </main>

      {/* Footer Credits */}
      <footer className="mt-8 text-center w-full max-w-[640px]">
        <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
          © 2024 WLOGIS - Suporte: suporte@wlogis.com.br
        </p>
      </footer>
    </div>
  );
}
