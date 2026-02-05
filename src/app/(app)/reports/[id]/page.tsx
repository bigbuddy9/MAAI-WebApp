'use client';

import { useParams, useRouter } from 'next/navigation';
import ReportDetailView from '@/components/views/ReportDetailView';

export default function ReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <ReportDetailView
      reportId={decodeURIComponent(id as string)}
      onBack={() => router.back()}
    />
  );
}
