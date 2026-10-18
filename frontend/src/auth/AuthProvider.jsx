import { useCallback, useEffect, useMemo, useState } from 'react';

import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getAuthRedirectUrl } from '../lib/auth-redirect';
import { AuthContext } from './AuthContext';

function assertSupabaseConfigured() {
  if (isSupabaseConfigured) return;

  const error = new Error('Supabase is not configured.');
  error.code = 'configuration_missing';
  throw error;
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        console.error('Unable to restore the Supabase session.', error);
      }
      setSession(data.session ?? null);
      setIsLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setIsLoading(false);
    });

    loadSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signInAsGuest = useCallback(async () => {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password }) => {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl({
          siteUrl: import.meta.env.VITE_SITE_URL,
          origin: window.location.origin,
          isDevelopment: import.meta.env.DEV,
        }),
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    assertSupabaseConfigured();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }, []);

  const value = useMemo(() => {
    const user = session?.user ?? null;

    return {
      session,
      user,
      isAnonymous: Boolean(user?.is_anonymous),
      isLoading,
      signIn,
      signUp,
      signInAsGuest,
      signOut,
    };
  }, [isLoading, session, signIn, signInAsGuest, signOut, signUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
