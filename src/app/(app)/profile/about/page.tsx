'use client';

import ProfileSubPageWrapper from '@/components/layout/ProfileSubPageWrapper';

const colors = {
  background: '#0A0A0A',
  card: '#0D0D0D',
  border: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textMuted: '#6B6B6B',
  borderSubtle: '#333333',
};

export default function AboutPage() {
  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <ProfileSubPageWrapper>
      <h1 style={s.pageTitle}>About</h1>

      <p style={s.tagline}>Your brain lies to you. Data doesn&apos;t.</p>

      <p style={s.description}>
        MyAccountableAI is a data-driven accountability platform that turns your daily actions into measurable progress.
      </p>

      <p style={s.description}>
        No motivational fluff. No excuses. No bullshit.
      </p>

      <p style={s.description}>
        Just cold, hard data that shows you exactly who you are and who you&apos;re actually becoming.
      </p>

      <div style={s.settingsCard}>
        <button style={s.settingsRow} onClick={() => handleExternalLink('https://myaccountable.ai/science')}>
          <span style={s.settingsLabel}>See the Science</span>
          <span style={s.externalIcon}>{'\u2197'}</span>
        </button>
      </div>

      <span style={s.sectionTitle}>Legal</span>
      <div style={s.settingsCard}>
        <button style={s.settingsRow} onClick={() => handleExternalLink('https://myaccountable.ai/terms')}>
          <span style={s.settingsLabel}>Terms of Service</span>
          <span style={s.externalIcon}>{'\u2197'}</span>
        </button>
        <button style={{ ...s.settingsRow, borderBottom: 'none' }} onClick={() => handleExternalLink('https://myaccountable.ai/privacy')}>
          <span style={s.settingsLabel}>Privacy Policy</span>
          <span style={s.externalIcon}>{'\u2197'}</span>
        </button>
      </div>
    </ProfileSubPageWrapper>
  );
}

const s: Record<string, React.CSSProperties> = {
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: 24,
    marginTop: 0,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: '24px',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 32,
    display: 'block',
  },
  settingsCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: `1px solid ${colors.border}`,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: 500,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  externalIcon: {
    fontSize: 14,
    color: colors.borderSubtle,
  },
};
