import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  profile_type: 'cliente' | 'operador';
  document: string;
}

function fromProfileRow(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    profileType: row.profile_type,
    document: row.document,
  };
}

interface SignUpMeta {
  name: string;
  profileType: 'cliente' | 'operador';
  document: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, meta: SignUpMeta) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      setProfile(null);
      return;
    }
    setProfile(fromProfileRow(data as ProfileRow));
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

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: meta.name,
          profile_type: meta.profileType,
          document: meta.document,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
