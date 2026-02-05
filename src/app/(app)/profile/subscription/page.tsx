'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/contexts/SubscriptionContext';

const colors = {
  background: '#0A0A0A',
  card: '#0D0D0D',
  border: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1A1',
  textMuted: '#6B6B6B',
  borderSubtle: '#333333',
  cyan: '#00FFFF',
};

export default function SubscriptionPage() {
  const router = useRouter();
  const { status, whitelisted, trialEnd, currentPeriodEnd, cancelAt } = useSubscription();
  const [managingLoading, setManagingLoading] = useState(false);

  const getStatusLabel = () => {
    if (whitelisted) return 'VIP Access';
    switch (status) {
      case 'trialing': return 'Free Trial';
      case 'active': return 'Active';
      case 'past_due': return 'Past Due';
      case 'canceled': return 'Canceled';
      default: return 'No Subscription';
    }
  };

  const getStatusColor = () => {
    if (whitelisted) return colors.cyan;
    switch (status) {
      case 'trialing': return '#FFD700';
      case 'active': return '#00CC66';
      case 'past_due': return '#FF6B35';
      case 'canceled': return '#FF4444';
      default: return colors.textMuted;
    }
  };

  const getDaysRemaining = () => {
    if (whitelisted) return null;
    const endDate = status === 'trialing' ? trialEnd : currentPeriodEnd;
    if (!endDate) return null;
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const daysRemaining = getDaysRemaining();

  const handleManageSubscription = async () => {
    if (whitelisted) return;
    setManagingLoading(true);
    try {
      // For now, direct to Stripe's customer portal
      // (You can add a portal API route later for a better experience)
      window.open('https://billing.stripe.com/p/login/test', '_blank');
    } finally {
      setManagingLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <button onClick={() => router.back()} style={s.backBtn}>
        <span style={s.backBtnText}>{'\u2039'}</span>
      </button>

      <h1 style={s.pageTitle}>Subscription</h1>

      <div style={s.planCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={s.planName}>MyAccountable.AI Pro</div>
          <div style={{ ...s.statusBadge, backgroundColor: `${getStatusColor()}20`, borderColor: `${getStatusColor()}40` }}>
            <span style={{ ...s.statusBadgeText, color: getStatusColor() }}>{getStatusLabel()}</span>
          </div>
        </div>
        {daysRemaining !== null && (
          <div style={s.planStatus}>
            {status === 'trialing'
              ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in trial`
              : cancelAt
                ? `Cancels in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
                : `Renews in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
            }
          </div>
        )}
        {whitelisted && (
          <div style={s.planStatus}>Lifetime access</div>
        )}
      </div>

      <p style={s.helperText}>
        Need help?{' '}
        <span
          style={s.helperLink}
          onClick={() => window.open('mailto:support@myaccountable.ai', '_blank')}
        >
          Contact us
        </span>
      </p>

      {!whitelisted && (
        <button
          style={{ ...s.primaryBtn, opacity: managingLoading ? 0.6 : 1 }}
          onClick={handleManageSubscription}
          disabled={managingLoading}
        >
          <span style={s.primaryBtnText}>
            {managingLoading ? 'Loading...' : 'Manage Subscription'}
          </span>
        </button>
      )}

      <p style={s.footerText}>
        All prices in USD. Applicable VAT, sales or other taxes may apply.
        Cancel your subscription at anytime.
      </p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    paddingBottom: 100,
    overflowY: 'auto',
    height: '100%',
  },
  backBtn: {
    marginBottom: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  backBtnText: {
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: 300,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: 32,
    marginTop: 0,
    letterSpacing: -0.5,
  },
  planCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 24,
    marginBottom: 40,
  },
  planName: {
    fontSize: 22,
    fontWeight: 700,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  statusBadge: {
    borderRadius: 6,
    padding: '3px 10px',
    border: '1px solid',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  planStatus: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  helperText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  helperLink: {
    color: colors.textPrimary,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  primaryBtn: {
    width: '100%',
    padding: 16,
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    border: 'none',
    cursor: 'pointer',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.background,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 11,
    color: colors.borderSubtle,
    textAlign: 'center' as const,
    marginTop: 48,
    lineHeight: '18px',
  },
};
