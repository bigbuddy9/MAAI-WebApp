'use client';

import { useParams, useRouter } from 'next/navigation';
import GoalDetailView from '@/components/views/GoalDetailView';

export default function GoalDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <GoalDetailView
      goalId={Number(id)}
      onBack={() => router.back()}
      onNavigateToTask={(taskId) => router.push(`/tasks/${taskId}`)}
      onEditGoal={(goalId) => router.push(`/goals/${goalId}/edit`)}
    />
  );
}
