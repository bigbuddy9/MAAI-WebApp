'use client';

import { ReactNode } from 'react';
import { FloatingDots } from '@/components/ui/FloatingDots';

interface ProfileSubPageWrapperProps {
  children: ReactNode;
}

export default function ProfileSubPageWrapper({ children }: ProfileSubPageWrapperProps) {
  return (
    <div style={s.pageWrapper}>
      {/* Full screen floating dots background */}
      <FloatingDots particleCount={150} side="full" />

      {/* Centered panel */}
      <div style={s.contentWrapper}>
        <div style={s.panel}>
          {children}
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
    padding: '20px',
    paddingTop: '40px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    border: '1px solid #1A1A1A',
    padding: '20px 16px 24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
    marginBottom: 40,
  },
};
