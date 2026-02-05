'use client';

import { useRouter } from 'next/navigation';
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

export default function ProfilePage() {
  const router = useRouter();
  const { signOut } = useAuth();

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

      {/* Profile panel floating on top */}
      <div style={s.contentWrapper}>
        <div style={s.profilePanel}>
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
  contentWrapper: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: 40,
    overflowY: 'auto',
  },
  profilePanel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    border: '1px solid #1A1A1A',
    padding: '24px 16px',
    marginBottom: 40,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
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
