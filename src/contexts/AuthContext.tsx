'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  displayName: string;
  age: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>({ displayName: '', age: '' });
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, age')
      .eq('id', userId)
      .single();
    if (data && !error) {
      setProfile({
        displayName: data.display_name || '',
        age: data.age?.toString() || '',
      });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      } else {
        setProfile({ displayName: '', age: '' });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.myaccountable.ai';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
        emailRedirectTo: `${redirectUrl}/verify-success`,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile({ displayName: '', age: '' });
  }, []);

  const updateProfile = useCallback((data: Partial<Profile>) => {
    setProfile(prev => ({ ...prev, ...data }));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [session?.user?.id, fetchProfile]);

  const user = session?.user ?? null;

  const value = useMemo(() => ({
    session, user, profile, isLoading, signUp, signIn, signOut, updateProfile, refreshProfile,
  }), [session, user, profile, isLoading, signUp, signIn, signOut, updateProfile, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
