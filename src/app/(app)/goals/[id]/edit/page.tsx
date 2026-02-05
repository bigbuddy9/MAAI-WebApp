'use client';

import { useParams, useRouter } from 'next/navigation';
import GoalEditView from '@/components/views/GoalEditView';

export default function GoalEditPage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <GoalEditView
      goalId={Number(id)}
      onBack={() => router.back()}
      onDeleted={() => router.push('/goals')}
    />
  );
}
