'use client';

import { useState } from 'react';
import ReportsListView from '@/components/views/ReportsListView';
import ReportDetailView from '@/components/views/ReportDetailView';

type PanelView =
  | { type: 'list' }
  | { type: 'detail'; reportId: string };

export default function ReportsPanel() {
  const [view, setView] = useState<PanelView>({ type: 'list' });

  if (view.type === 'detail') {
    return (
      <ReportDetailView
        reportId={view.reportId}
        onBack={() => setView({ type: 'list' })}
      />
    );
  }

  return (
    <ReportsListView
      onNavigateToReport={(reportId) => setView({ type: 'detail', reportId })}
    />
  );
}
