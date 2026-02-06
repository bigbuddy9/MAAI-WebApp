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

  // Hardcoded whitelist as failsafe - same as verify-success
  const hardcodedWhitelist = [
    'jessebarbato788@gmail.com',
    'brunnno2002@gmail.com',
    'jono.kazzaa@gmail.com',
    'n.business.corp@gmail.com',
    'ashton.lake8@gmail.com',
    'kingjouza@gmail.com',
    'jackoaye501@gmail.com',
    'noahemerald10@gmail.com',
    'alexandre.patterson@gmail.com',
    'echoai.generativeai@gmail.com',
  ];

  const userEmail = session?.user?.email?.toLowerCase() || '';
  const isHardcodedWhitelisted = hardcodedWhitelist.includes(userEmail);

  // Redirect to plan picker if no active subscription (but not for whitelisted users)
  useEffect(() => {
    if (!isLoading && !subLoading && session && !hasSubscription && !isHardcodedWhitelisted) {
      // Check sessionStorage to prevent redirect loop
      const wasWhitelisted = sessionStorage.getItem('wasWhitelisted');
      if (wasWhitelisted === 'true') {
        return; // Don't redirect, keep the flag
      }
      router.replace('/choose-plan');
    }
  }, [isLoading, subLoading, session, hasSubscription, isHardcodedWhitelisted, router]);

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

  // Allow access if they have subscription OR are whitelisted OR have the sessionStorage flag
  const wasWhitelisted = typeof window !== 'undefined' && sessionStorage.getItem('wasWhitelisted') === 'true';
  if (!session || (!hasSubscription && !isHardcodedWhitelisted && !wasWhitelisted)) return null;

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
