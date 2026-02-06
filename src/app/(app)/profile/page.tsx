'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { FloatingDots } from '@/components/ui/FloatingDots';

interface SettingsRowProps {
  label: string;
  onPress: () => void;
  isLogout?: boolean;
}

function SettingsRow({ label, onPress, isLogout }: SettingsRowProps) {
  return (
    <button
      style={{
        ...s.settingsRow,
        ...(isLogout ? {} : {}),
      }}
      onClick={onPress}
    >
      <span style={isLogout ? s.settingsLabelLogout : s.settingsLabel}>{label}</span>
      <span style={isLogout ? s.settingsArrowLogout : s.settingsArrow}>›</span>
    </button>
  );
}

const NAV_ITEMS = [
  { label: 'Tracker', href: '/tracker' },
  { label: 'Goals', href: '/goals' },
  { label: 'Stats', href: '/stats' },
  { label: 'Reports', href: '/reports' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      signOut();
      router.replace('/login');
    }
  };

  const handleSendFeedback = () => {
    alert('This would open your email client or a feedback form.');
  };

  return (
    <div style={s.pageWrapper}>
      {/* Full screen floating dots background */}
      <FloatingDots particleCount={150} side="full" />

      {/* Navigation Menu Overlay */}
      {menuOpen && (
        <div style={s.menuOverlay} onClick={() => setMenuOpen(false)}>
          <div style={s.menuPopover} onClick={e => e.stopPropagation()}>
            <div style={s.menuLogo}>
              <Image src="/logo-icon.png" alt="MyAccountableAI" width={160} height={160} style={{ width: '50%', height: 'auto' }} />
            </div>
            <div style={s.menuTitle}>Select Panel</div>
            {NAV_ITEMS.map(item => (
              <button
                key={item.href}
                style={s.menuOption}
                onClick={() => {
                  setMenuOpen(false);
                  router.push(item.href);
                }}
              >
                <span>{item.label}</span>
              </button>
            ))}
            <div style={s.menuDivider} />
            <button
              style={{ ...s.menuOption, ...s.menuOptionActive }}
              onClick={() => setMenuOpen(false)}
            >
              <span>Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile panel floating on top */}
      <div style={s.contentWrapper}>
        <div style={s.profilePanel}>
          {/* Header with menu button */}
          <div style={s.panelHeader}>
            <span style={s.panelTitle}>Profile</span>
            <button
              style={s.menuButton}
              onClick={() => setMenuOpen(true)}
              title="Menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div style={s.settingsCard}>
            <SettingsRow label="About" onPress={() => router.push('/profile/about')} />
            <SettingsRow label="Settings" onPress={() => router.push('/profile/settings')} />
            <SettingsRow label="Subscription" onPress={() => router.push('/profile/subscription')} />
            <SettingsRow label="Account Info" onPress={() => router.push('/profile/account')} />
            <SettingsRow label="Achievements" onPress={() => router.push('/profile/achievements')} />
            <SettingsRow label="Send Feedback" onPress={handleSendFeedback} />
          </div>

          <div style={s.settingsCard}>
            <SettingsRow label="Logout" onPress={handleLogout} isLogout />
          </div>

          <p style={s.versionText}>VERSION 1.0.0</p>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pageWrapper: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 6,
    border: '1px solid #1A1A1A',
    background: '#0D0D0D',
    color: '#6B6B6B',
    cursor: 'pointer',
  },
  menuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  menuPopover: {
    backgroundColor: '#000000',
    border: '1px solid #1A1A1A',
    borderRadius: 12,
    width: 160,
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
    overflow: 'hidden',
    paddingBottom: 6,
  },
  menuLogo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 0 4px',
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    padding: '4px 12px 0',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#1A1A1A',
    margin: '3px 12px',
  },
  menuOption: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    borderRadius: 0,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  menuOptionActive: {
    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(56, 189, 248, 0.2))',
  },
  contentWrapper: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: '20px',
    boxSizing: 'border-box',
  },
  profilePanel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    border: '1px solid #1A1A1A',
    padding: '20px 16px 24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  settingsCard: {
    backgroundColor: '#0D0D0D',
    border: '1px solid #1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  settingsRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #1A1A1A',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: 500,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  settingsLabelLogout: {
    fontSize: 16,
    fontWeight: 400,
    color: '#404040',
    letterSpacing: -0.2,
  },
  settingsArrow: {
    fontSize: 18,
    color: '#333333',
    fontWeight: 300,
  },
  settingsArrowLogout: {
    fontSize: 18,
    color: '#333333',
    fontWeight: 300,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#333333',
    marginTop: 48,
    letterSpacing: 0.5,
  },
};
