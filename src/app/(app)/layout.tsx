'use client';

import { useEffect, useRef } from 'react';
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
  const redirectingToStripe = useRef(false);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [session, isLoading, router]);

  // Redirect to Stripe checkout if no active subscription
  useEffect(() => {
    if (!isLoading && !subLoading && session && !hasSubscription && !redirectingToStripe.current) {
      redirectingToStripe.current = true;
      // Redirect to Stripe checkout
      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, email: session.user.email }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.url) {
            window.location.href = data.url;
          }
        })
        .catch(() => {
          redirectingToStripe.current = false;
        });
    }
  }, [isLoading, subLoading, session, hasSubscription]);

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
