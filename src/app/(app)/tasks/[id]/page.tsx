'use client';

import { useParams, useRouter } from 'next/navigation';
import TaskDetailView from '@/components/views/TaskDetailView';

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <TaskDetailView
      taskId={Number(id)}
      onBack={() => router.back()}
      onNavigateToHistory={(taskId) => router.push(`/tasks/${taskId}/history`)}
    />
  );
}
