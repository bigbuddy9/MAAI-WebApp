'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Force dynamic rendering to avoid static prerender issues
export const dynamic = 'force-dynamic';

const t = {
  bg: '#000000',
  fg: '#ffffff',
  cyan: '#00FFFF',
  fgSecondary: '#6b6b6b',
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
};

export default function VerifySuccessPage() {
  const { session, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const hasChecked = useRef(false);
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [statusText, setStatusText] = useState('Verifying your account...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Still loading auth
    if (authLoading) {
      setStatusText('Verifying your account...');
      return;
    }

    // If not logged in after auth loaded, go to login
    if (!session) {
      setStatusText('Redirecting to login...');
      router.replace('/login');
      return;
    }

    // Only check once
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Do our own subscription/whitelist check directly
    checkSubscriptionAndRedirect();
  }, [session, authLoading, router]);

  const checkSubscriptionAndRedirect = async () => {
    if (!session) return;

    const userEmail = session.user.email;
    const userId = session.user.id;

    console.log('Session user:', { userId, userEmail });
    setStatusText(`Checking subscription for ${userEmail}...`);

    // Hardcoded whitelist as failsafe
    const hardcodedWhitelist = [
      'jessebarbato788@gmail.com',
      'brunnno2002@gmail.com',
      'jono.kazzaa@gmail.com',
      'n.business.corp@gmail.com',
      'ashton.lake8@gmail.com',
      'kingjouza@gmail.com',
      'jackoaye501@gmail.com',
      'noahemerald10@gmail.com',
      'alexandre.patterson@gmail.com',
      'echoai.generativeai@gmail.com',
    ];

    // If no email, we can't check whitelist - go to checkout
    if (!userEmail) {
      console.log('No email in session, going to checkout');
      setStatusText('Setting up your free trial...');
      setStatus('redirecting');
      redirectToCheckout();
      return;
    }

    // Check hardcoded whitelist first
    if (hardcodedWhitelist.includes(userEmail.toLowerCase())) {
      console.log('User in hardcoded whitelist! Redirecting to tracker');
      setStatusText('Welcome! Redirecting...');
      sessionStorage.setItem('wasWhitelisted', 'true');
      router.replace('/tracker');
      return;
    }

    // Otherwise check the API
    try {
      const url = `/api/debug-whitelist?email=${encodeURIComponent(userEmail)}`;
      console.log('Fetching whitelist check:', url);

      const res = await fetch(url);
      const data = await res.json();

      console.log('Whitelist check response:', data);

      const isWhitelisted = data.isWhitelisted || data.found || (data.whitelistRows && data.whitelistRows.length > 0);

      if (isWhitelisted) {
        console.log('User is whitelisted! Redirecting to tracker');
        setStatusText('Welcome! Redirecting...');
        sessionStorage.setItem('wasWhitelisted', 'true');
        router.replace('/tracker');
      } else {
        console.log('User not whitelisted, going to checkout');
        setStatusText('Setting up your free trial...');
        setStatus('redirecting');
        redirectToCheckout();
      }
    } catch (err) {
      console.error('Whitelist check failed:', err);
      setStatusText('Setting up your free trial...');
      setStatus('redirecting');
      redirectToCheckout();
    }
  };

  const redirectToCheckout = async () => {
    if (!session) {
      setError('No session found. Please try logging in again.');
      setStatus('error');
      return;
    }

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
        setStatusText('Redirecting to checkout...');
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session.');
        setStatus('error');
      }
    } catch (err) {
      setError('Connection error. Please check your internet and try again.');
      setStatus('error');
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus('redirecting');
    setStatusText('Retrying...');
    hasChecked.current = false;
    redirectToCheckout();
  };

  // Error state
  if (status === 'error' && error) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.errorIcon}>!</div>
          <h1 style={s.title}>Something went wrong</h1>
          <p style={s.subtitle}>{error}</p>
          <button onClick={handleRetry} style={s.retryButton}>
            Try Again
          </button>
          <button onClick={() => router.replace('/login')} style={s.backButton}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Loading/redirecting state
  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.spinner} />
        <p style={s.text}>{statusText}</p>
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
