'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const colors = {
  background: '#0A0A0A',
  card: '#0D0D0D',
  border: '#1A1A1A',
  borderSubtle: '#333333',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1A1',
  textMuted: '#6B6B6B',
  cyan: '#00FFFF',
  cyanDark: '#00B3B3',
};

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0A0A0A' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #333', borderTop: '2px solid #00FFFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}

function SubscribeContent() {
  const { session, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const canceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [session, authLoading, router]);

  if (authLoading || !session || !user) {
    return (
      <div style={s.loadingContainer}>
        <div style={s.spinner} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        console.error('Checkout error:', error);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.content}>
        {/* Logo / Brand */}
        <div style={s.logoContainer}>
          <div style={s.logoCircle}>
            <span style={s.logoText}>M</span>
          </div>
          <h1 style={s.brandName}>MyAccountable.AI</h1>
        </div>

        {canceled && (
          <div style={s.canceledBanner}>
            <span style={s.canceledText}>Checkout was canceled. No worries — you can try again below.</span>
          </div>
        )}

        {/* Pricing Card */}
        <div style={s.pricingCard}>
          <div style={s.planBadge}>
            <span style={s.planBadgeText}>PRO</span>
          </div>

          <h2 style={s.planTitle}>Start Your Journey</h2>
          <p style={s.planDescription}>
            Track your goals, build habits, and hold yourself accountable with data-driven insights.
          </p>

          <div style={s.priceRow}>
            <span style={s.priceAmount}>$9.99</span>
            <span style={s.priceUnit}>/month</span>
          </div>

          <div style={s.trialBadge}>
            <span style={s.trialBadgeText}>7-day free trial</span>
          </div>

          <div style={s.featureList}>
            {[
              'Unlimited goals & tasks',
              'Daily habit tracking',
              'Performance stats & analytics',
              'Weekly progress reports',
              'Achievement system',
              'Cross-platform sync',
            ].map((feature) => (
              <div key={feature} style={s.featureItem}>
                <span style={s.checkmark}>{'\u2713'}</span>
                <span style={s.featureText}>{feature}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{
              ...s.subscribeButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <span style={s.subscribeButtonText}>
              {loading ? 'Loading...' : 'Start Free Trial'}
            </span>
          </button>

          <p style={s.disclaimer}>
            Your card will be charged $9.99/month after the 7-day trial ends.
            Cancel anytime.
          </p>
        </div>

        <button onClick={() => router.push('/login')} style={s.backLink}>
          <span style={s.backLinkText}>{'\u2190'} Back to login</span>
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: colors.background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: colors.background,
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2px solid #333',
    borderTop: `2px solid ${colors.cyan}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cyan,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.background,
  },
  brandName: {
    fontSize: 22,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
    letterSpacing: -0.5,
  },
  canceledBanner: {
    backgroundColor: '#1A1A00',
    border: '1px solid #333300',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 20,
    width: '100%',
  },
  canceledText: {
    fontSize: 13,
    color: '#CCCC66',
  },
  pricingCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
    padding: 32,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  planBadge: {
    backgroundColor: colors.cyan,
    borderRadius: 6,
    padding: '4px 14px',
    marginBottom: 20,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: 800,
    color: colors.background,
    letterSpacing: 2,
  },
  planTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: '0 0 8px',
    letterSpacing: -0.5,
  },
  planDescription: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    margin: '0 0 24px',
    lineHeight: '20px',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 44,
    fontWeight: 800,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  priceUnit: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: 500,
  },
  trialBadge: {
    backgroundColor: `${colors.cyan}15`,
    border: `1px solid ${colors.cyan}30`,
    borderRadius: 20,
    padding: '6px 16px',
    marginBottom: 28,
  },
  trialBadgeText: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.cyan,
  },
  featureList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginBottom: 32,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  checkmark: {
    fontSize: 14,
    color: colors.cyan,
    fontWeight: 700,
  },
  featureText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  subscribeButton: {
    width: '100%',
    padding: 16,
    backgroundColor: colors.cyan,
    borderRadius: 12,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.background,
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    margin: 0,
    lineHeight: '18px',
  },
  backLink: {
    marginTop: 24,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
  },
  backLinkText: {
    fontSize: 13,
    color: colors.textMuted,
  },
};
