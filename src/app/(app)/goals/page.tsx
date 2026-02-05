'use client';

import { useState } from 'react';
import GoalListView from '@/components/views/GoalListView';
import GoalDetailView from '@/components/views/GoalDetailView';
import GoalEditView from '@/components/views/GoalEditView';
import AddGoalView from '@/components/views/AddGoalView';
import TaskDetailView from '@/components/views/TaskDetailView';
import TaskHistoryView from '@/components/views/TaskHistoryView';

type OverlayView =
  | null
  | { type: 'detail'; goalId: number }
  | { type: 'editGoal'; goalId: number }
  | { type: 'add' }
  | { type: 'taskDetail'; taskId: number; fromGoalId: number }
  | { type: 'taskHistory'; taskId: number; fromGoalId: number };

export default function GoalsPage() {
  const [overlay, setOverlay] = useState<OverlayView>(null);

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <GoalListView
        onNavigateToGoal={(goalId) => setOverlay({ type: 'detail', goalId })}
        onAddGoal={() => setOverlay({ type: 'add' })}
      />

      {overlay?.type === 'detail' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <GoalDetailView
            goalId={overlay.goalId}
            onBack={() => setOverlay(null)}
            onNavigateToTask={(taskId) => setOverlay({ type: 'taskDetail', taskId, fromGoalId: overlay.goalId })}
            onEditGoal={(goalId) => setOverlay({ type: 'editGoal', goalId })}
          />
        </div>
      )}

      {overlay?.type === 'editGoal' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <GoalEditView
            goalId={overlay.goalId}
            onBack={() => setOverlay({ type: 'detail', goalId: overlay.goalId })}
            onDeleted={() => setOverlay(null)}
          />
        </div>
      )}

      {overlay?.type === 'add' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <AddGoalView onBack={() => setOverlay(null)} />
        </div>
      )}

      {overlay?.type === 'taskDetail' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <TaskDetailView
            taskId={overlay.taskId}
            onBack={() => setOverlay({ type: 'detail', goalId: overlay.fromGoalId })}
            onNavigateToHistory={(taskId) => setOverlay({ type: 'taskHistory', taskId, fromGoalId: overlay.fromGoalId })}
          />
        </div>
      )}

      {overlay?.type === 'taskHistory' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <TaskHistoryView
            taskId={overlay.taskId}
            onBack={() => setOverlay({ type: 'taskDetail', taskId: overlay.taskId, fromGoalId: overlay.fromGoalId })}
          />
        </div>
      )}
    </div>
  );
}
