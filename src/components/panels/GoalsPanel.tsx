'use client';

import { useState } from 'react';
import GoalListView from '@/components/views/GoalListView';
import GoalDetailView from '@/components/views/GoalDetailView';
import GoalEditView from '@/components/views/GoalEditView';
import AddGoalView from '@/components/views/AddGoalView';
import TaskDetailView from '@/components/views/TaskDetailView';
import TaskHistoryView from '@/components/views/TaskHistoryView';

type PanelView =
  | { type: 'list' }
  | { type: 'detail'; goalId: number }
  | { type: 'editGoal'; goalId: number }
  | { type: 'add' }
  | { type: 'taskDetail'; taskId: number; fromGoalId: number }
  | { type: 'taskHistory'; taskId: number; fromGoalId: number };

export default function GoalsPanel() {
  const [view, setView] = useState<PanelView>({ type: 'list' });

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Always render the main goal list */}
      <GoalListView
        onNavigateToGoal={(goalId) => setView({ type: 'detail', goalId })}
        onAddGoal={() => setView({ type: 'add' })}
      />

      {/* Overlay: Goal Detail */}
      {view.type === 'detail' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <GoalDetailView
            goalId={view.goalId}
            onBack={() => setView({ type: 'list' })}
            onNavigateToTask={(taskId) => setView({ type: 'taskDetail', taskId, fromGoalId: view.goalId })}
            onEditGoal={(goalId) => setView({ type: 'editGoal', goalId })}
          />
        </div>
      )}

      {/* Overlay: Edit Goal */}
      {view.type === 'editGoal' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <GoalEditView
            goalId={view.goalId}
            onBack={() => setView({ type: 'detail', goalId: view.goalId })}
            onDeleted={() => setView({ type: 'list' })}
          />
        </div>
      )}

      {/* Overlay: Add Goal */}
      {view.type === 'add' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <AddGoalView onBack={() => setView({ type: 'list' })} />
        </div>
      )}

      {/* Overlay: Task Detail (from goal) */}
      {view.type === 'taskDetail' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <TaskDetailView
            taskId={view.taskId}
            onBack={() => setView({ type: 'detail', goalId: view.fromGoalId })}
            onNavigateToHistory={(taskId) => setView({ type: 'taskHistory', taskId, fromGoalId: view.fromGoalId })}
          />
        </div>
      )}

      {/* Overlay: Task History (from goal) */}
      {view.type === 'taskHistory' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <TaskHistoryView
            taskId={view.taskId}
            onBack={() => setView({ type: 'taskDetail', taskId: view.taskId, fromGoalId: view.fromGoalId })}
          />
        </div>
      )}
    </div>
  );
}
