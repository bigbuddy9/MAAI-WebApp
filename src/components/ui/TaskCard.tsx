'use client';

import { getGoalColor } from '@/shared';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: {
    id: number;
    name: string;
    completed: boolean;
    goalPriority: number;
    goalId: number;
    type: 'checkbox' | 'number';
    value?: number;
    target?: number;
  };
  onToggle: () => void;
  onPress?: () => void;
}

export default function TaskCard({ task, onToggle, onPress }: TaskCardProps) {
  const goalColor = getGoalColor(task.goalPriority);
  const mainColor = typeof goalColor === 'object' && 'main' in goalColor ? goalColor.main : '#4B5563';

  return (
    <div className={styles.card} onClick={onPress}>
      <div
        className={`${styles.checkbox} ${task.completed ? styles.checkboxChecked : ''}`}
        style={task.completed ? { backgroundColor: mainColor } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {task.completed && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="#000" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className={styles.taskInfo}>
        <div className={`${styles.taskName} ${task.completed ? styles.taskNameCompleted : ''}`}>
          {task.name}
        </div>
        {task.type === 'number' && (
          <div className={styles.taskMeta}>
            <span style={{ fontSize: 12, color: '#6B6B6B' }}>
              {task.value ?? 0} / {task.target ?? '—'}
            </span>
          </div>
        )}
      </div>
      <div
        style={{
          width: 4,
          height: 32,
          borderRadius: 2,
          backgroundColor: mainColor,
          opacity: 0.6,
        }}
      />
    </div>
  );
}
