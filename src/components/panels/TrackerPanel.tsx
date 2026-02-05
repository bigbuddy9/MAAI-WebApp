'use client';

import { useState } from 'react';
import TrackerView from '@/components/views/TrackerView';
import TaskDetailView from '@/components/views/TaskDetailView';
import AddTaskView from '@/components/views/AddTaskView';
import TaskHistoryView from '@/components/views/TaskHistoryView';

type PanelView =
  | { type: 'main' }
  | { type: 'taskDetail'; taskId: number }
  | { type: 'addTask'; createdAt?: string }
  | { type: 'taskHistory'; taskId: number };

export default function TrackerPanel() {
  const [view, setView] = useState<PanelView>({ type: 'main' });

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Always render the main tracker view */}
      <TrackerView
        onNavigateToTask={(taskId) => setView({ type: 'taskDetail', taskId })}
        onAddTask={(dateStr) => setView({ type: 'addTask', createdAt: dateStr })}
      />

      {/* Overlay: Task Detail */}
      {view.type === 'taskDetail' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <TaskDetailView
            taskId={view.taskId}
            onBack={() => setView({ type: 'main' })}
            onNavigateToHistory={(taskId) => setView({ type: 'taskHistory', taskId })}
          />
        </div>
      )}

      {/* Overlay: Add Task */}
      {view.type === 'addTask' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <AddTaskView
            onBack={() => setView({ type: 'main' })}
            createdAt={view.createdAt}
          />
        </div>
      )}

      {/* Overlay: Task History */}
      {view.type === 'taskHistory' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <TaskHistoryView
            taskId={view.taskId}
            onBack={() => setView({ type: 'taskDetail', taskId: view.taskId })}
          />
        </div>
      )}
    </div>
  );
}
