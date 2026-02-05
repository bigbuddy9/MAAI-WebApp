'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SubscriptionState {
  active: boolean;
  status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'whitelisted';
  whitelisted: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  isLoading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  refreshSubscription: () => Promise<void>;
  startCheckout: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    active: false,
    status: 'none',
    whitelisted: false,
    trialEnd: null,
    currentPeriodEnd: null,
    cancelAt: null,
    isLoading: true,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, active: false, status: 'none', isLoading: false }));
      return;
    }

    try {
      const res = await fetch(`/api/subscription?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`);
      if (!res.ok) throw new Error('Failed to fetch subscription');
      const data = await res.json();
      setState({
        active: data.active,
        status: data.status,
        whitelisted: data.whitelisted ?? false,
        trialEnd: data.trialEnd ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        cancelAt: data.cancelAt ?? null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const startCheckout = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  }, [user]);

  const value = useMemo(() => ({
    ...state,
    refreshSubscription: fetchSubscription,
    startCheckout,
  }), [state, fetchSubscription, startCheckout]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
