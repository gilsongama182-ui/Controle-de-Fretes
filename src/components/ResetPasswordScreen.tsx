import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-wlogis.png" alt="WLogis" className="h-16 w-auto mb-3" />
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <h2 className="font-headline text-lg font-bold text-on-surface">Senha atualizada</h2>
                <p className="text-sm text-on-surface-variant mt-1">Sua nova senha já está ativa. Você pode continuar usando o sistema normalmente.</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-on-primary text-sm font-semibold py-3 rounded-lg hover:bg-primary-container transition-all"
              >
                Continuar
              </button>
            </div>
          ) : (
            <>
              <header className="mb-6">
                <h2 className="font-headline text-2xl font-bold text-on-surface">Definir nova senha</h2>
                <p className="text-sm text-on-surface-variant">Escolha uma nova senha para sua conta.</p>
              </header>

              {errorMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-error-container/20 border border-error/30 px-3 py-2 text-xs font-semibold text-error">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block" htmlFor="new-password">
                    Nova senha
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface-variant"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block" htmlFor="confirm-password">
                    Confirmar nova senha
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-on-primary text-sm font-semibold py-3.5 rounded-lg shadow-sm hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-75"
                >
                  <span>{isSubmitting ? 'Salvando...' : 'Salvar nova senha'}</span>
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => signOut()}
                  className="w-full text-center text-xs font-semibold text-secondary hover:underline"
                >
                  Cancelar e sair
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
