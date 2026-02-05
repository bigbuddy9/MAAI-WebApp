'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { GoalProvider } from '@/contexts/GoalContext';
import { TaskProvider } from '@/contexts/TaskContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { AchievementProvider } from '@/contexts/AchievementContext';
import DashboardLayout, { useBreakpoint } from '@/components/layout/DashboardLayout';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const { active: hasSubscription, isLoading: subLoading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();
  const slots = useBreakpoint();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [session, isLoading, router]);

  // Redirect to plan picker if no active subscription
  // Only redirect if we've confirmed there's no subscription (not just on initial load)
  useEffect(() => {
    if (!isLoading && !subLoading && session && !hasSubscription) {
      // Check sessionStorage to prevent redirect loop after successful whitelist check
      const wasWhitelisted = sessionStorage.getItem('wasWhitelisted');
      if (wasWhitelisted === 'true') {
        // Don't redirect, clear the flag and refetch
        sessionStorage.removeItem('wasWhitelisted');
        return;
      }
      router.replace('/choose-plan');
    }
  }, [isLoading, subLoading, session, hasSubscription, router]);

  if (isLoading || subLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0A0A0A',
      }}>
        <div style={{
          width: 24,
          height: 24,
          border: '2px solid #333',
          borderTop: '2px solid #00FFFF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session || !hasSubscription) return null;

  return (
    <GoalProvider>
      <TaskProvider>
        <StatsProvider>
          <AchievementProvider>
            <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <DashboardLayout slots={slots}>
                  {children}
                </DashboardLayout>
              </div>
            </div>
          </AchievementProvider>
        </StatsProvider>
      </TaskProvider>
    </GoalProvider>
  );
}
