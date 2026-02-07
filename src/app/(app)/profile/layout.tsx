'use client';

import { ReactNode } from 'react';
import { FloatingDots } from '@/components/ui/FloatingDots';

interface ProfileLayoutProps {
  children: ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <div style={s.pageWrapper}>
      {/* Persistent floating dots background - stays the same across all profile sub-pages */}
      <FloatingDots particleCount={150} side="full" />

      {/* Profile content */}
      {children}
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
};
