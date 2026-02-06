'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FloatingDots } from '@/components/ui/FloatingDots';

interface ProfileSubPageWrapperProps {
  children: ReactNode;
}

const MENU_ITEMS = [
  { label: 'Tracker', href: '/tracker' },
  { label: 'Goals', href: '/goals' },
  { label: 'Stats', href: '/stats' },
  { label: 'Reports', href: '/reports' },
  { label: 'Profile', href: '/profile' },
];

export default function ProfileSubPageWrapper({ children }: ProfileSubPageWrapperProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={s.pageWrapper}>
      {/* Full screen floating dots background */}
      <FloatingDots particleCount={150} side="full" />

      {/* Centered panel */}
      <div style={s.contentWrapper}>
        <div style={s.panel}>
          {/* Header inside panel - back arrow left, menu right */}
          <div style={s.panelHeader}>
            <button onClick={() => router.back()} style={s.backBtn}>
              <span style={s.backBtnText}>{'\u2039'}</span>
            </button>
            <button onClick={() => setMenuOpen(true)} style={s.menuBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {/* Page content */}
          <div style={s.content}>
            {children}
          </div>
        </div>
      </div>

      {/* Menu overlay */}
      {menuOpen && (
        <div style={s.overlay} onClick={() => setMenuOpen(false)}>
          <div style={s.menuPopover} onClick={e => e.stopPropagation()}>
            <div style={s.menuLogo}>
              <Image src="/logo-icon.png" alt="MyAccountableAI" width={160} height={160} style={{ width: '50%', height: 'auto' }} />
            </div>
            <div style={s.menuTitle}>Select Panel</div>
            {MENU_ITEMS.map(item => (
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
          </div>
        </div>
      )}
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
    alignItems: 'stretch',
    padding: '20px',
    boxSizing: 'border-box',
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    border: '1px solid #1A1A1A',
    padding: '16px 16px 24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  backBtnText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 300,
  },
  menuBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '1px solid #1A1A1A',
    background: '#0A0A0A',
    color: '#6B6B6B',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuPopover: {
    backgroundColor: '#0D0D0D',
    border: '1px solid #1A1A1A',
    borderRadius: 16,
    padding: '24px 20px',
    minWidth: 220,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  menuLogo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  menuOption: {
    background: 'none',
    border: 'none',
    padding: '12px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 16,
    fontWeight: 500,
    color: '#FFFFFF',
  },
};
