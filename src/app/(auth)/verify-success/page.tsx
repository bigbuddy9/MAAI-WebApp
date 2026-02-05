'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

const t = {
  bg: '#000000',
  fg: '#ffffff',
  cyan: '#00FFFF',
  fgSecondary: '#6b6b6b',
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
};

export default function VerifySuccessPage() {
  const { session, isLoading: authLoading } = useAuth();
  const { active: hasSubscription, isLoading: subLoading } = useSubscription();
  const router = useRouter();
  const hasStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for both auth and subscription to load
    if (authLoading || subLoading) return;

    // If not logged in, go to login
    if (!session) {
      router.replace('/login');
      return;
    }

    // If already has subscription (whitelisted), go straight to app
    if (hasSubscription) {
      router.replace('/tracker');
      return;
    }

    // Otherwise, redirect to Stripe checkout immediately
    if (!hasStarted.current) {
      hasStarted.current = true;
      redirectToCheckout();
    }
  }, [session, authLoading, hasSubscription, subLoading, router]);

  const redirectToCheckout = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
        }),
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        // Show error instead of silently redirecting
        setError(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
  };

  // Show error if checkout failed
  if (error) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.errorIcon}>!</div>
          <h1 style={s.title}>Something went wrong</h1>
          <p style={s.subtitle}>{error}</p>
          <button onClick={() => { setError(null); hasStarted.current = false; redirectToCheckout(); }} style={s.retryButton}>
            Try Again
          </button>
          <button onClick={() => router.replace('/login')} style={s.backButton}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.spinner} />
        <p style={s.text}>Setting up your free trial...</p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { -webkit-font-smoothing: antialiased; }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: t.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: t.font,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: 24,
    textAlign: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #333',
    borderTop: `3px solid ${t.cyan}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    fontSize: 16,
    color: t.fg,
    fontWeight: 500,
    margin: 0,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: '#ff4444',
    color: t.fg,
    fontSize: 28,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: t.fg,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: t.fgSecondary,
    margin: '8px 0 24px',
    maxWidth: 300,
  },
  retryButton: {
    padding: '14px 32px',
    backgroundColor: t.cyan,
    color: t.bg,
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 12,
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: t.fgSecondary,
    border: `1px solid #333`,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
