import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

export const metadata: Metadata = {
  title: 'MyAccountableAI',
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
        {/* Modal root - fixed position covering viewport, pointer-events none so it doesn't block */}
        <div id="modal-root" />
      </body>
    </html>
  );
}
