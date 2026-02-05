'use client';

import { useParams, useRouter } from 'next/navigation';
import TaskHistoryView from '@/components/views/TaskHistoryView';

export default function TaskHistoryPage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <TaskHistoryView
      taskId={Number(id)}
      onBack={() => router.back()}
    />
  );
}
