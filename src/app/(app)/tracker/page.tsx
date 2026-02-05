'use client';

import { useState } from 'react';
import TrackerView from '@/components/views/TrackerView';
import TaskDetailView from '@/components/views/TaskDetailView';
import AddTaskView from '@/components/views/AddTaskView';
import TaskHistoryView from '@/components/views/TaskHistoryView';

type OverlayView =
  | null
  | { type: 'taskDetail'; taskId: number }
  | { type: 'addTask'; createdAt?: string }
  | { type: 'taskHistory'; taskId: number };

export default function TrackerPage() {
  const [overlay, setOverlay] = useState<OverlayView>(null);

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <TrackerView
        onNavigateToTask={(taskId) => setOverlay({ type: 'taskDetail', taskId })}
        onAddTask={(dateStr) => setOverlay({ type: 'addTask', createdAt: dateStr })}
      />

      {overlay?.type === 'taskDetail' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <TaskDetailView
            taskId={overlay.taskId}
            onBack={() => setOverlay(null)}
            onNavigateToHistory={(taskId) => setOverlay({ type: 'taskHistory', taskId })}
          />
        </div>
      )}

      {overlay?.type === 'addTask' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <AddTaskView
            onBack={() => setOverlay(null)}
            createdAt={overlay.createdAt}
          />
        </div>
      )}

      {overlay?.type === 'taskHistory' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <TaskHistoryView
            taskId={overlay.taskId}
            onBack={() => setOverlay({ type: 'taskDetail', taskId: overlay.taskId })}
          />
        </div>
      )}
    </div>
  );
}
