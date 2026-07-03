import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, HelpCircle, ArrowRight, AlertCircle, Truck, MapPin, Clock } from 'lucide-react';
import { ActivePage } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LoginScreenProps {
  onNavigate: (page: ActivePage) => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message
      );
    }
    // Em caso de sucesso, o App.tsx redireciona automaticamente
    // com base na sessão + perfil restaurados pelo AuthContext.
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-surface">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-primary-container rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-secondary-container rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 z-10">

        {/* Left Side: Form Container */}
        <main className="w-full lg:max-w-[440px]">
          {/* Brand Identity */}
          <div className="flex flex-col items-center mb-8">
            <img src="/logo-wlogis.png" alt="WLogis" className="h-20 w-auto mb-3" />
            <p className="font-sans text-xs font-semibold text-secondary uppercase tracking-[0.2em] mt-1">
              Logistics Core System
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-8 transition-all duration-300 hover:shadow-md">
            <header className="mb-6">
              <h2 className="font-headline text-2xl font-bold text-on-surface">Bem-vindo</h2>
              <p className="font-sans text-sm text-on-surface-variant">Acesse sua conta para gerenciar entregas</p>
            </header>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-error-container/20 border border-error/30 px-3 py-2 text-xs font-semibold text-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block" htmlFor="email">
                  E-MAIL CORPORATIVO
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full pl-11 pr-4 py-3 bg-surface border border-outline-variant rounded-lg font-sans text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline-variant"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block" htmlFor="password">
                    SENHA
                  </label>
                  <a href="#forgot" className="text-xs font-semibold text-primary hover:text-primary-container transition-colors underline-offset-4 hover:underline">
                    Esqueci minha senha
                  </a>
                </div>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-surface border border-outline-variant rounded-lg font-sans text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline-variant"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface-variant transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 py-1">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-on-surface-variant select-none cursor-pointer">
                  Mantenha-me conectado
                </label>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-on-primary font-sans text-sm font-semibold py-4 rounded-lg shadow-sm hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 group disabled:opacity-75"
              >
                <span>{isSubmitting ? 'Validando...' : 'Entrar'}</span>
                {!isSubmitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            {/* Secondary Actions */}
            <div className="mt-6 pt-4 border-t border-outline-variant flex flex-col items-center gap-3">
              <p className="text-sm text-on-surface-variant">
                Não tem acesso?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('cadastro')}
                  className="text-primary font-semibold hover:underline underline-offset-4"
                >
                  Criar uma conta
                </button>
              </p>
              <div className="flex items-center gap-4 mt-2">
                <a href="#support" className="text-xs font-semibold text-outline hover:text-on-surface transition-colors flex items-center gap-1">
                  <HelpCircle className="w-4 h-4" /> Suporte
                </a>
                <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
                <a href="#privacy" className="text-xs font-semibold text-outline hover:text-on-surface transition-colors">
                  Privacidade
                </a>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <footer className="mt-8 text-center">
            <p className="text-[11px] font-semibold text-outline uppercase tracking-wider">
              © 2024 WLOGIS • Global Operations
            </p>
          </footer>
        </main>

        {/* Right Side: Brand Panel (sem foto externa — só o logo WLOGIS + ícones) */}
        <aside className="hidden lg:flex flex-1 items-center justify-center ml-8">
          <div className="relative w-full max-w-xl aspect-square bg-gradient-to-br from-secondary-container via-white to-surface-container rounded-3xl overflow-hidden shadow-2xl border border-outline-variant flex flex-col items-center justify-center p-12 text-center">
            <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-[#FF6600]/10 blur-3xl"></div>
            <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-secondary/10 blur-3xl"></div>

            <img src="/logo-wlogis.png" alt="WLogis" className="h-16 w-auto mb-10 relative z-10" />

            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                <Truck className="w-7 h-7 text-secondary" />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#FF6600]/10 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-[#FF6600]" />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#F5C93E]/20 flex items-center justify-center">
                <Clock className="w-7 h-7 text-[#B8900A]" />
              </div>
            </div>

            <h3 className="font-headline text-2xl font-bold text-primary mb-2 relative z-10">Precisão em cada entrega.</h3>
            <p className="font-sans text-sm text-secondary leading-relaxed max-w-sm relative z-10">
              Acompanhamento em tempo real para frotas globais de alto desempenho.
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}
