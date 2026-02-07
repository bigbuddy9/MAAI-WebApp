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

  const userId = user?.id;
  const userEmail = user?.email;

  // Fetch subscription when user changes
  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, active: false, status: 'none', isLoading: false }));
      return;
    }

    let cancelled = false;

    fetch(`/api/subscription?userId=${userId}&email=${encodeURIComponent(userEmail || '')}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch subscription');
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        setState({
          active: data.active,
          status: data.status,
          whitelisted: data.whitelisted ?? false,
          trialEnd: data.trialEnd ?? null,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
          cancelAt: data.cancelAt ?? null,
          isLoading: false,
        });
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Error fetching subscription:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      });

    return () => { cancelled = true; };
  }, [userId, userEmail]);

  const refreshSubscription = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/subscription?userId=${userId}&email=${encodeURIComponent(userEmail || '')}`);
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
    }
  }, [userId, userEmail]);

  const startCheckout = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: userEmail }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  }, [userId, userEmail]);

  const value = useMemo(() => ({
    ...state,
    refreshSubscription,
    startCheckout,
  }), [state, refreshSubscription, startCheckout]);

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
