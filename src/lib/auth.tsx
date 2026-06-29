import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: humanizeAuthError(error) };
        return { error: null };
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: humanizeAuthError(error) };
        if (data.user && !data.session) {
          return { error: 'Check your email to confirm your account before signing in.' };
        }
        return { error: null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function humanizeAuthError(error: { message?: string; code?: string }): string {
  const msg = error.message ?? '';
  if (/invalid login credentials/i.test(msg) || /invalid credentials/i.test(msg)) {
    return 'Incorrect email or password. Please try again.';
  }
  if (/user already registered/i.test(msg)) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (/rate limit/i.test(msg)) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (/network|fetch/i.test(msg)) {
    return 'Network error — please check your connection and try again.';
  }
  if (/password/i.test(msg) && /weak|short|at least/i.test(msg)) {
    return 'Password is too weak. Use at least 6 characters.';
  }
  return msg || 'Something went wrong. Please try again.';
}
