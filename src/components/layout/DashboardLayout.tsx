'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './DashboardLayout.module.css';
import TrackerPanel from '@/components/panels/TrackerPanel';
import GoalsPanel from '@/components/panels/GoalsPanel';
import StatsPanel from '@/components/panels/StatsPanel';
import ReportsPanel from '@/components/panels/ReportsPanel';

type PanelId = 'tracker' | 'goals' | 'stats' | 'reports';

const PANELS: { id: PanelId; label: string; href: string }[] = [
  { id: 'tracker', label: 'Tracker', href: '/tracker' },
  { id: 'goals', label: 'Goals', href: '/goals' },
  { id: 'stats', label: 'Stats', href: '/stats' },
  { id: 'reports', label: 'Reports', href: '/reports' },
];

// Routes that should show panels in multi-panel mode
const PANEL_ROUTES = ['/', '/tracker', '/goals', '/stats', '/reports'];

// Map route to page label for single-panel mode header
function getPageLabel(pathname: string): string {
  if (pathname.startsWith('/profile')) return 'Profile';
  const match = PANELS.find(p => pathname === p.href || (pathname === '/' && p.id === 'tracker'));
  return match?.label ?? 'Menu';
}

function PanelComponent({ id }: { id: PanelId }) {
  switch (id) {
    case 'tracker': return <TrackerPanel />;
    case 'goals': return <GoalsPanel />;
    case 'stats': return <StatsPanel />;
    case 'reports': return <ReportsPanel />;
  }
}

export function useBreakpoint() {
  const [slots, setSlots] = useState(1);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1720) setSlots(4);
      else if (w >= 1290) setSlots(3);
      else if (w >= 880) setSlots(2);
      else setSlots(1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return slots;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  slots: number;
}

export default function DashboardLayout({ children, slots }: DashboardLayoutProps) {
  const [selectedPanels, setSelectedPanels] = useState<PanelId[]>(['tracker', 'goals', 'stats']);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const handleSwapPanel = useCallback((index: number, newPanel: PanelId) => {
    setSelectedPanels(prev => {
      const next = [...prev];
      // If the new panel is already visible elsewhere, swap them
      const existingIndex = next.findIndex(p => p === newPanel);
      if (existingIndex !== -1 && existingIndex !== index) {
        next[existingIndex] = next[index];
      }
      next[index] = newPanel;
      return next;
    });
    setSelectorOpen(false);
    setSwapIndex(null);
  }, []);

  // When navigating to a panel route, ensure that panel is first in selectedPanels
  useEffect(() => {
    const match = PANELS.find(p => pathname === p.href || (pathname === '/' && p.id === 'tracker'));
    if (match) {
      setSelectedPanels(prev => {
        if (prev[0] === match.id) return prev; // already first
        const filtered = prev.filter(p => p !== match.id);
        const next = [match.id, ...filtered];
        return next.slice(0, 3) as PanelId[];
      });
    }
  }, [pathname]);

  // Check if current route should show panel mode
  const isPanelRoute = PANEL_ROUTES.includes(pathname);

  // Single-panel mode OR non-panel route: render children (normal Next.js routing)
  if (slots === 1 || !isPanelRoute) {
    const isProfileRoute = pathname.startsWith('/profile');
    const isSubPage = pathname !== '/tracker' && pathname !== '/' && pathname !== '/goals' && pathname !== '/stats' && pathname !== '/reports' && pathname !== '/profile';

    // Profile page takes full control - no header, no wrapper constraints
    if (isProfileRoute) {
      return <>{children}</>;
    }

    return (
      <main className={styles.singleColumn}>
        <div className={styles.singleHeader}>
          <span className={styles.panelHeaderLabel}>{getPageLabel(pathname)}</span>
          <button
            className={styles.swapButton}
            onClick={() => { setSelectorOpen(true); setSwapIndex(null); }}
            title="Menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {/* Navigation Menu */}
        {selectorOpen && (
          <div className={styles.selectorOverlay} onClick={() => { setSelectorOpen(false); setSwapIndex(null); }}>
            <div className={styles.selectorPopover} onClick={e => e.stopPropagation()}>
              {/* Logo */}
              <div className={styles.menuLogo}>
                <Image src="/logo-icon.png" alt="MyAccountableAI" width={160} height={160} style={{ width: '50%', height: 'auto' }} />
              </div>
              <div className={styles.selectorTitle}>Select Panel</div>
              {PANELS.map(p => {
                const isActive = pathname === p.href || (pathname === '/' && p.id === 'tracker');
                return (
                  <button
                    key={p.id}
                    className={`${styles.selectorOption} ${isActive ? styles.selectorOptionActive : ''}`}
                    onClick={() => {
                      setSelectorOpen(false);
                      router.push(p.href);
                    }}
                  >
                    <span>{p.label}</span>
                  </button>
                );
              })}
              <div className={styles.selectorDivider} />
              <button
                className={`${styles.selectorOption} ${isProfileRoute ? styles.selectorOptionActive : ''}`}
                onClick={() => {
                  setSelectorOpen(false);
                  router.push('/profile');
                }}
              >
                <span>Profile</span>
              </button>
            </div>
          </div>
        )}
        <div className={styles.singleContent}>
          {children}
        </div>
      </main>
    );
  }

  // Multi-panel mode
  const visiblePanels = slots >= 4
    ? (['tracker', 'goals', 'stats', 'reports'] as PanelId[])
    : selectedPanels.slice(0, slots);

  return (
    <main className={styles.dashboard}>
      <div className={styles.panelGrid}>
        {visiblePanels.map((panelId, index) => {
          const panelLabel = PANELS.find(p => p.id === panelId)?.label ?? panelId;
          return (
            <div key={panelId} className={styles.panelWrapper}>
              {/* Panel header: label on left, swap button on right */}
              <div className={styles.panelHeader}>
                <span className={styles.panelHeaderLabel}>{panelLabel}</span>
                <button
                  className={styles.swapButton}
                  onClick={() => {
                    setSwapIndex(index);
                    setSelectorOpen(true);
                  }}
                  title="Change panel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div className={styles.panelContent}>
                <PanelComponent id={panelId} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel Selector Popover */}
      {selectorOpen && swapIndex !== null && (
        <div className={styles.selectorOverlay} onClick={() => { setSelectorOpen(false); setSwapIndex(null); }}>
          <div className={styles.selectorPopover} onClick={e => e.stopPropagation()}>
            {/* Logo */}
            <div className={styles.menuLogo}>
              <Image src="/logo-icon.png" alt="MyAccountableAI" width={160} height={160} style={{ width: '50%', height: 'auto' }} />
            </div>
            <div className={styles.selectorTitle}>Select Panel</div>
            {PANELS.map(p => {
              const isCurrent = visiblePanels[swapIndex] === p.id;
              return (
                <button
                  key={p.id}
                  className={`${styles.selectorOption} ${isCurrent ? styles.selectorOptionActive : ''}`}
                  onClick={() => handleSwapPanel(swapIndex, p.id)}
                >
                  <span>{p.label}</span>
                </button>
              );
            })}
            <div className={styles.selectorDivider} />
            <button
              className={styles.selectorOption}
              onClick={() => {
                setSelectorOpen(false);
                setSwapIndex(null);
                router.push('/profile');
              }}
            >
              <span>Profile</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
