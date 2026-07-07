import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { User, ProfileType, Genero, AccountStatus } from '../types';

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  profile_type: ProfileType;
  document: string;
  genero: Genero;
  status: AccountStatus;
}

function fromProfileRow(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    profileType: row.profile_type,
    document: row.document,
    genero: row.genero,
    status: row.status,
  };
}

interface SignUpMeta {
  name: string;
  profileType: 'cliente' | 'operador';
  document: string;
  genero: Genero;
}

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  profileError: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  // needsEmailConfirmation: true quando o cadastro deu certo mas o projeto
  // exige confirmação por e-mail (nesse caso o Supabase não devolve sessão
  // nenhuma) — a tela de Cadastro usa isso pra avisar o usuário em vez de
  // deixá-lo achando que já pode logar.
  signUp: (email: string, password: string, meta: SignUpMeta) => Promise<{ error: AuthError | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Se a conta existe no auth mas não tem linha em profiles (ex: falha pontual
  // da trigger de signup), não fica presa numa tela sem feedback nenhum.
  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      setProfile(null);
      setProfileError(true);
      return;
    }
    setProfile(fromProfileRow(data as ProfileRow));
    setProfileError(false);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!active) return;
      setSession(initialSession);
      if (initialSession?.user) {
        await loadProfile(initialSession.user.id);
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Disparado quando o usuário chega pelo link de "esqueci minha senha".
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      setSession(newSession);
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, meta: SignUpMeta) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: meta.name,
          profile_type: meta.profileType,
          document: meta.document,
          genero: meta.genero,
        },
      },
    });
    return { error, needsEmailConfirmation: !error && !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  // Usado tanto pelo "Esqueci minha senha" do login quanto pelo master
  // reenviando o link de redefinição pra outro usuário (tela de Usuários).
  // Não exige nenhum privilégio especial — é um endpoint público do Supabase.
  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsPasswordRecovery(false);
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileError,
        isPasswordRecovery,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
