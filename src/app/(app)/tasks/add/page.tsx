'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import AddTaskView from '@/components/views/AddTaskView';

export default function AddTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdAt = searchParams.get('createdAt') || undefined;

  return <AddTaskView onBack={() => router.back()} createdAt={createdAt} />;
}
