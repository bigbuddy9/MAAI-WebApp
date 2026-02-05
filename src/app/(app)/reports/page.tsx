'use client';

import { useRouter } from 'next/navigation';
import ReportsListView from '@/components/views/ReportsListView';

export default function ReportsPage() {
  const router = useRouter();

  return (
    <ReportsListView
      onNavigateToReport={(reportId) => router.push(`/reports/${encodeURIComponent(reportId)}`)}
    />
  );
}
