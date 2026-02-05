'use client';

import { useRouter } from 'next/navigation';
import AddGoalView from '@/components/views/AddGoalView';

export default function AddGoalPage() {
  const router = useRouter();
  return <AddGoalView onBack={() => router.back()} />;
}
