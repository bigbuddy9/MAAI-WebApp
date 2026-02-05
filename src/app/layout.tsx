import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

export const metadata: Metadata = {
  title: 'myAccountable.ai',
  description: 'Track your goals, build habits, stay accountable.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <SubscriptionProvider>
            {children}
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
