import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, HelpCircle, ArrowRight, Truck } from 'lucide-react';
import { ActivePage, User } from '../types';

interface LoginScreenProps {
  onNavigate: (page: ActivePage) => void;
  onLogin: (user: User) => void;
}

export default function LoginScreen({ onNavigate, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'operador' | 'cliente'>('operador');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      // Simulate login
      const mockUser: User = {
        name: selectedRole === 'operador' ? 'Operador Hemmersbach' : 'Cliente Hemmersbach',
        email: email || (selectedRole === 'operador' ? 'operador@hemmersbach.com' : 'cliente@empresa.com'),
        profileType: selectedRole,
        document: selectedRole === 'operador' ? '00.000.000/0001-00' : '12.345.678/0001-90',
      };
      onLogin(mockUser);
      onNavigate(selectedRole === 'operador' ? 'dashboard-operador' : 'dashboard-cliente');
    }, 1200);
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
            <div className="w-16 h-16 bg-primary flex items-center justify-center rounded-xl shadow-lg mb-4">
              <Truck className="text-on-primary w-10 h-10" />
            </div>
            <h1 className="font-headline text-4xl font-bold text-primary tracking-tight">Hemmersbach</h1>
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

            {/* Quick Role Toggle for Demo convenience */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setSelectedRole('operador')}
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  selectedRole === 'operador'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Sou Operador
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('cliente')}
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  selectedRole === 'cliente'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Sou Cliente
              </button>
            </div>

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
                    placeholder={selectedRole === 'operador' ? 'operador@hemmersbach.com' : 'cliente@empresa.com'}
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
              © 2024 Hemmersbach Logistics • Global Operations
            </p>
          </footer>
        </main>

        {/* Right Side: Futuristic Logistics Hub Illustration */}
        <aside className="hidden lg:flex flex-1 items-center justify-center ml-8">
          <div className="relative w-full max-w-xl aspect-square bg-surface-container rounded-3xl overflow-hidden shadow-2xl border border-outline-variant group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent z-10"></div>
            <img
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBD7WQkZu74qG44uBzfGqeD-qLx6YHgxc_ZlRV0clRSMX6wY7qJ-XZu9xgyDsZYbxAaXmzeafPl9wPhlLdrhrD1gloifjlgfROdSSSoGjj64SZK5_q6UIJZkbRBbYi3D3yYKj_40IbF4xpyYCqBafYw_1n1xPBXUsJLMyKFqni8rpp0Hx8NUL7pwzhWa-CG-QSNNJ1JXoYPNSK72JbtKHm7i-Lf-bRZwjXgHfyz-FUgKWAlEPbZjOuevA"
              alt="Hemmersbach modern logistics hub at dusk"
            />
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white z-20">
              <h3 className="font-headline text-2xl font-bold mb-1">Precisão em cada entrega.</h3>
              <p className="font-sans text-sm opacity-90 leading-relaxed">
                Acompanhamento em tempo real para frotas globais de alto desempenho.
              </p>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
