'use client';

import { useState, useEffect, useMemo, useRef, useId, useCallback } from 'react';
import { useTasks } from '@/contexts/TaskContext';
import { useGoals } from '@/contexts/GoalContext';
import { useStats } from '@/contexts/StatsContext';
import { getGoalColor, formatDate } from '@/shared';
import ModalPortal from '@/components/ui/ModalPortal';

type TabMode = 'edit' | 'history';
type TaskType = 'checkbox' | 'number';
type Importance = 'medium' | 'high' | 'maximum';
type Difficulty = 'medium' | 'high' | 'maximum';
type Frequency = '1x' | '2x' | '3x' | '4x' | '5x' | '6x' | 'daily';

// Theme constants (matching mobile exactly)
const colors = {
  background: '#0A0A0A',
  card: '#0D0D0D',
  elevated: '#111111',
  border: '#1A1A1A',
  borderLight: '#2A2A2A',
  borderSubtle: '#333333',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1A1',
  textMuted: '#6B6B6B',
  textFaint: '#404040',
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24 };
const borderRadius = { sm: 6, md: 8, lg: 10, xl: 12, '2xl': 14, '3xl': 16 };

interface TaskDetailViewProps {
  taskId: number;
  onBack?: () => void;
  onNavigateToHistory?: (taskId: number) => void;
}

export default function TaskDetailView({ taskId, onBack, onNavigateToHistory }: TaskDetailViewProps) {
  const { tasks, updateTask, deleteTask } = useTasks();
  const { completions } = useStats();
  const { goals: allGoals } = useGoals();

  // Only show active (non-completed) goals
  const goals = allGoals.filter(g => !g.completed);

  const taskFromContext = tasks.find(t => t.id === taskId);

  const FOUNDATIONS = { id: 0, name: 'Foundations', priority: 99 };

  // Initialize state from task
  const [taskName, setTaskName] = useState(taskFromContext?.name || '');
  const [taskType, setTaskType] = useState<TaskType>(taskFromContext?.type || 'checkbox');
  const [target, setTarget] = useState(taskFromContext?.target?.toString() || '');
  const [frequency, setFrequency] = useState<Frequency>(taskFromContext?.frequency || 'daily');
  const [selectedDays, setSelectedDays] = useState<number[]>(taskFromContext?.selectedDays || [0, 1, 2, 3, 4, 5, 6]);
  const [importance, setImportance] = useState<Importance>(taskFromContext?.importance || 'medium');
  const [difficulty, setDifficulty] = useState<Difficulty>(taskFromContext?.difficulty || 'medium');

  const parsedGoalId = taskFromContext?.goalId ?? 0;
  const initialGoal = parsedGoalId === 0
    ? FOUNDATIONS
    : goals.find(g => g.id === parsedGoalId) || (goals.length > 0 ? goals[0] : FOUNDATIONS);
  const [selectedGoal, setSelectedGoal] = useState<{ id: number; name: string; priority: number }>(initialGoal);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasResolvedGoalRef = useRef(goals.length > 0);

  // Pull-down-to-dismiss
  const [pullOffset, setPullOffset] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const pullStartY = useRef(0);
  const DISMISS_THRESHOLD = 120;

  const handlePullStart = useCallback((clientY: number) => {
    if (isDismissing) return;
    setIsPulling(true);
    pullStartY.current = clientY;
    setPullOffset(0);
  }, [isDismissing]);

  const handlePullMove = useCallback((clientY: number) => {
    if (!isPulling) return;
    const delta = Math.max(0, clientY - pullStartY.current);
    setPullOffset(delta);
  }, [isPulling]);

  const handlePullEnd = useCallback(() => {
    if (!isPulling) return;
    if (pullOffset >= DISMISS_THRESHOLD) {
      setIsDismissing(true);
      setIsPulling(false);
      setTimeout(() => {
        onBack?.();
      }, 350);
    } else {
      setPullOffset(0);
      setIsPulling(false);
    }
  }, [isPulling, pullOffset, onBack, DISMISS_THRESHOLD]);

  useEffect(() => {
    if (!isPulling) return;
    const onMouseMove = (e: MouseEvent) => { e.preventDefault(); handlePullMove(e.clientY); };
    const onMouseUp = () => handlePullEnd();
    const onTouchMove = (e: TouchEvent) => { handlePullMove(e.touches[0].clientY); };
    const onTouchEnd = () => handlePullEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isPulling, handlePullMove, handlePullEnd]);

  const [activeTab, setActiveTab] = useState<TabMode>('edit');

  // Update selected goal when goals load asynchronously
  useEffect(() => {
    if (!hasResolvedGoalRef.current && goals.length > 0 && parsedGoalId !== 0) {
      hasResolvedGoalRef.current = true;
      const match = goals.find(g => g.id === parsedGoalId);
      if (match) setSelectedGoal(match);
    }
  }, [goals, parsedGoalId]);

  // Sync state when taskFromContext changes (e.g. on first load)
  useEffect(() => {
    if (taskFromContext) {
      setTaskName(taskFromContext.name);
      setTaskType(taskFromContext.type);
      setTarget(taskFromContext.target?.toString() || '');
      setFrequency(taskFromContext.frequency);
      setSelectedDays(taskFromContext.selectedDays);
      setImportance(taskFromContext.importance);
      setDifficulty(taskFromContext.difficulty);
    }
  }, [taskFromContext?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const frequencies: Frequency[] = ['1x', '2x', '3x', '4x', '5x', '6x', 'daily'];
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Build completion history - compute fresh each render to ensure updates
  const completionHistory: { [date: string]: boolean } = {};
  completions.forEach(c => {
    if (c.taskId === taskId && c.completed) {
      completionHistory[c.date] = true;
    }
  });

  // Debug: log completion data (remove after debugging)
  console.log('[TaskDetailView] taskId:', taskId, 'completions for task:', completions.filter(c => c.taskId === taskId), 'history:', completionHistory);

  const getRequiredDays = (freq: Frequency): number => {
    if (freq === 'daily') return 7;
    return parseInt(freq.replace('x', ''), 10);
  };

  const handleSave = () => {
    if (!taskName.trim()) {
      alert('Please enter a name for your task.');
      return;
    }

    const requiredDays = getRequiredDays(frequency);
    const selectedCount = selectedDays.length;

    if (selectedCount !== requiredDays) {
      const diff = requiredDays - selectedCount;
      if (diff > 0) {
        alert(`You need to select ${diff} more day${diff > 1 ? 's' : ''} for a ${frequency === 'daily' ? 'daily' : frequency + '/week'} task.`);
      } else {
        alert(`Please deselect ${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''} for a ${frequency}/week task.`);
      }
      return;
    }

    updateTask(taskId, {
      name: taskName,
      type: taskType,
      target: taskType === 'number' ? parseInt(target, 10) || undefined : undefined,
      frequency,
      selectedDays,
      importance,
      difficulty,
      goalId: selectedGoal.id,
      goalPriority: selectedGoal.priority,
    });
    onBack?.();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteTask(taskId);
    setShowDeleteConfirm(false);
    onBack?.();
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  const goalColor = selectedGoal ? getGoalColor(selectedGoal.priority) : getGoalColor(99);
  const mainColor = typeof goalColor === 'object' && 'main' in goalColor ? goalColor.main : '#4B5563';

  if (!taskFromContext) {
    return (
      <div style={s.container}>
        <div style={s.notFoundContainer}>
          <span style={{ color: colors.textMuted, fontSize: 15, marginBottom: 20 }}>Task not found</span>
          <button onClick={() => onBack?.()} style={s.closeButton}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...s.container,
      transform: isDismissing ? 'translateY(100vh)' : pullOffset > 0 ? `translateY(${pullOffset}px)` : undefined,
      transition: isDismissing ? 'transform 350ms ease-in' : isPulling ? 'none' : 'transform 200ms ease-out',
    }}>
      {/* Drag Handle — pull down to dismiss */}
      <div
        style={s.dragHandleWrapper}
        onMouseDown={(e) => { e.preventDefault(); handlePullStart(e.clientY); }}
        onTouchStart={(e) => handlePullStart(e.touches[0].clientY)}
      >
        <div style={s.dragHandle} />
      </div>

      {/* Header */}
      <div style={s.header}>
        <span style={s.headerTitle}>{taskName || 'Task'}</span>
        <button onClick={() => onBack?.()} style={s.cancelButton}>Done</button>
      </div>

      {/* Tab Selector */}
      <div style={s.tabSelector}>
        {(['edit', 'history'] as TabMode[]).map((tab) => (
          <button
            key={tab}
            style={{
              ...s.tabButton,
              ...(activeTab === tab ? s.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            <span style={{
              ...s.tabButtonText,
              ...(activeTab === tab ? s.tabButtonTextActive : {}),
            }}>
              {tab === 'edit' ? 'Edit' : 'History'}
            </span>
          </button>
        ))}
      </div>

      {/* History View */}
      {activeTab === 'history' && (
        <div style={s.historyContent}>
          <WebTaskHistoryGrid
            goalColor={{ main: mainColor }}
            selectedDays={selectedDays}
            completionHistory={completionHistory}
            startDate={taskFromContext.createdAt ? new Date(taskFromContext.createdAt) : undefined}
          />
        </div>
      )}

      {/* Edit View */}
      {activeTab === 'edit' && (
        <div style={s.scrollContent}>
          {/* Linked Goal */}
          <div style={s.field}>
            <span style={s.fieldLabel}>Linked Goal</span>
            <button style={s.goalDropdown} onClick={() => setShowGoalPicker(true)}>
              <div style={s.goalSelected}>
                <div style={{ ...s.goalColorDot, backgroundColor: mainColor }} />
                <span style={s.goalSelectedName}>{selectedGoal.name}</span>
              </div>
              <span style={s.dropdownArrow}>&rsaquo;</span>
            </button>
          </div>

          {/* Task Name */}
          <div style={s.field}>
            <span style={s.fieldLabel}>Task Name</span>
            <input
              style={s.textInput}
              placeholder="What do you need to do?"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </div>

          {/* Task Type */}
          <div style={s.field}>
            <span style={s.fieldLabel}>Task Type</span>
            <div style={s.typeCard}>
              <div style={s.segmentControl}>
                {(['checkbox', 'number'] as TaskType[]).map((type) => (
                  <button
                    key={type}
                    style={{
                      ...s.segmentButton,
                      ...(taskType === type ? s.segmentButtonActive : {}),
                    }}
                    onClick={() => setTaskType(type)}
                  >
                    <span style={{
                      ...s.segmentButtonText,
                      ...(taskType === type ? s.segmentButtonTextActive : {}),
                    }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
              <div style={s.typeDivider} />
              <div style={s.typePreview}>
                <span style={s.previewLabel}>Preview</span>
                {taskType === 'checkbox' ? (
                  <div style={{ ...s.previewCheckboxChecked, backgroundColor: mainColor }} />
                ) : (
                  <div style={{ ...s.previewNumeric, borderColor: mainColor }}>
                    <span style={s.previewNumericText}>0</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Minimum Completion (only for numeric tasks) */}
          {taskType === 'number' && (
            <div style={s.field}>
              <span style={s.fieldLabel}>Minimum to Complete</span>
              <div style={s.targetInputRow}>
                <input
                  style={s.targetInput}
                  placeholder="0"
                  value={target}
                  onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <span style={s.targetHint}>or more to complete</span>
              </div>
            </div>
          )}

          {/* Frequency */}
          <div style={s.field}>
            <span style={s.fieldLabel}>Frequency</span>
            <div style={s.frequencyRow}>
              {frequencies.map((freq) => (
                <button
                  key={freq}
                  style={{
                    ...s.frequencyButton,
                    ...(frequency === freq ? s.frequencyButtonActive : {}),
                  }}
                  onClick={() => {
                    setFrequency(freq);
                    if (freq === 'daily') {
                      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
                    } else if (frequency === 'daily' || frequency !== freq) {
                      setSelectedDays([]);
                    }
                  }}
                >
                  <span style={{
                    ...s.frequencyText,
                    ...(frequency === freq ? s.frequencyTextActive : {}),
                  }}>
                    {freq === 'daily' ? '7x' : freq}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Which Days */}
          {frequency !== 'daily' && (
            <div style={s.field}>
              <span style={s.fieldLabel}>Which Days</span>
              <div style={s.dayPicker}>
                {dayLabels.map((day, index) => (
                  <button
                    key={index}
                    style={{
                      ...s.dayButton,
                      ...(selectedDays.includes(index) ? s.dayButtonActive : {}),
                    }}
                    onClick={() => toggleDay(index)}
                  >
                    <span style={{
                      ...s.dayButtonText,
                      ...(selectedDays.includes(index) ? s.dayButtonTextActive : {}),
                    }}>
                      {day}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Importance */}
          <div style={s.field}>
            <span style={s.fieldLabel}>Importance</span>
            <div style={s.segmentControlStandalone}>
              {(['medium', 'high', 'maximum'] as Importance[]).map((imp) => (
                <button
                  key={imp}
                  style={{
                    ...s.segmentButton,
                    ...(importance === imp ? s.segmentButtonActive : {}),
                  }}
                  onClick={() => setImportance(imp)}
                >
                  <span style={{
                    ...s.segmentButtonText,
                    ...(importance === imp ? s.segmentButtonTextActive : {}),
                  }}>
                    {imp.charAt(0).toUpperCase() + imp.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div style={s.field}>
            <span style={s.fieldLabel}>Difficulty</span>
            <div style={s.segmentControlStandalone}>
              {(['medium', 'high', 'maximum'] as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  style={{
                    ...s.segmentButton,
                    ...(difficulty === diff ? s.segmentButtonActive : {}),
                  }}
                  onClick={() => setDifficulty(diff)}
                >
                  <span style={{
                    ...s.segmentButtonText,
                    ...(difficulty === diff ? s.segmentButtonTextActive : {}),
                  }}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button style={s.saveButton} onClick={handleSave}>
            <span style={s.saveButtonText}>Save Changes</span>
          </button>

          {/* Delete Button */}
          <button style={s.deleteButton} onClick={handleDelete}>
            <span style={s.deleteButtonText}>Delete Task</span>
          </button>
        </div>
      )}

      {/* Goal Picker Modal - rendered via ModalPortal to ensure it's always on top */}
      <ModalPortal isOpen={showGoalPicker}>
        <div style={s.modalOverlay} onClick={() => setShowGoalPicker(false)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <span style={s.modalTitle}>Select Goal</span>
            {goals.map((goal) => {
              const color = getGoalColor(goal.priority);
              const gMain = typeof color === 'object' && 'main' in color ? color.main : '#4B5563';
              const isSelected = selectedGoal.id === goal.id;
              return (
                <button
                  key={goal.id}
                  style={{
                    ...s.goalOption,
                    ...(isSelected ? s.goalOptionSelected : {}),
                  }}
                  onClick={() => {
                    setSelectedGoal(goal);
                    setShowGoalPicker(false);
                  }}
                >
                  <div style={{ ...s.goalOptionDot, backgroundColor: gMain }} />
                  <span style={{
                    ...s.goalOptionText,
                    ...(isSelected ? s.goalOptionTextSelected : {}),
                  }}>
                    {goal.name}
                  </span>
                </button>
              );
            })}
            {/* Foundations option -- always last */}
            {(() => {
              const foundationsColor = getGoalColor(FOUNDATIONS.priority);
              const fMain = typeof foundationsColor === 'object' && 'main' in foundationsColor ? foundationsColor.main : '#4B5563';
              const isSelected = selectedGoal.id === FOUNDATIONS.id;
              return (
                <button
                  style={{
                    ...s.goalOption,
                    ...(isSelected ? s.goalOptionSelected : {}),
                  }}
                  onClick={() => {
                    setSelectedGoal(FOUNDATIONS);
                    setShowGoalPicker(false);
                  }}
                >
                  <div style={{ ...s.goalOptionDot, backgroundColor: fMain }} />
                  <span style={{
                    ...s.goalOptionText,
                    ...(isSelected ? s.goalOptionTextSelected : {}),
                  }}>
                    Foundations
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      </ModalPortal>

      {/* Delete Confirmation Modal - rendered via ModalPortal */}
      <ModalPortal isOpen={showDeleteConfirm}>
        <div style={s.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <span style={s.modalTitle}>Delete Task</span>
            <p style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: '20px' }}>
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <button
                style={{ ...s.saveButton, marginTop: 0, backgroundColor: '#1a0000', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={confirmDelete}
              >
                <span style={{ ...s.saveButtonText, color: '#EF4444' }}>Delete</span>
              </button>
              <button
                style={{ ...s.saveButton, marginTop: 0 }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                <span style={s.saveButtonText}>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

// ============================================
// Inline Web TaskHistoryGrid (matching mobile TaskHistoryGrid)
// ============================================

const DOT_SIZE = 28;
const DOT_GAP = 4;

interface WeekData {
  days: { date: Date; status: 'completed' | 'missed' | 'not-scheduled' | 'future' }[];
  month: string;
  showMonth: boolean;
  completedCount: number;
  scheduledCount: number;
}

function getColorForPercent(percent: number): string {
  if (percent >= 90) return '#00FFFF';
  if (percent >= 70) return '#38BDF8';
  if (percent >= 50) return '#2563EB';
  if (percent >= 30) return '#A78BFA';
  if (percent >= 10) return '#7C3AED';
  return '#4B5563';
}

function ProgressRingWeb({ percent, label, sublabel }: { percent: number; label: string; sublabel: string }) {
  const color = getColorForPercent(percent);
  const size = 70;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const filterId = `ring-glow-detail-${useId().replace(/:/g, '')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1A1A1A" strokeWidth={stroke} />
          {/* Progress glow layer */}
          {percent > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={color} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              filter={`url(#${filterId})`}
            />
          )}
          {/* Progress solid layer */}
          {percent > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={color} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
            />
          )}
        </svg>
        {/* Center label */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: size, height: size,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>{label}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, color: '#666666', marginTop: 12, textAlign: 'center' }}>{sublabel}</span>
    </div>
  );
}

interface WebTaskHistoryGridProps {
  taskName?: string;
  goalColor: { main: string };
  selectedDays: number[];
  completionHistory?: { [date: string]: boolean };
  startDate?: Date;
  onDone?: () => void;
}

function WebTaskHistoryGrid({
  taskName,
  goalColor,
  selectedDays,
  completionHistory,
  startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  onDone,
}: WebTaskHistoryGridProps) {
  const weeks = useMemo(() => {
    const history = completionHistory || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);

    // Debug: log what the grid receives
    console.log('[WebTaskHistoryGrid] received history:', history);
    console.log('[WebTaskHistoryGrid] today dateStr:', todayStr);
    console.log('[WebTaskHistoryGrid] history has today?', history[todayStr]);

    const weeksData: WeekData[] = [];

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const effectiveStart = new Date(Math.min(startDate.getTime(), thirtyDaysAgo.getTime()));
    const start = new Date(effectiveStart);
    const startDayOfWeek = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - startDayOfWeek);

    let lastMonth = -1;
    const current = new Date(start);

    while (current <= today || weeksData.length === 0) {
      const week: { date: Date; status: 'completed' | 'missed' | 'not-scheduled' | 'future' }[] = [];
      let completedCount = 0;
      let scheduledCount = 0;

      const weekMonth = current.getMonth();
      const yearShort = current.getFullYear().toString().slice(-2);
      const monthName = `${current.toLocaleDateString('en-US', { month: 'short' })} ${yearShort}`;
      const showMonth = weekMonth !== lastMonth;
      if (showMonth) lastMonth = weekMonth;

      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(current);
        dayDate.setDate(current.getDate() + day);

        const dayOfWeek = (dayDate.getDay() + 6) % 7;
        const dateStr = formatDate(dayDate);
        const isFuture = dayDate > today;
        const isBeforeStart = dayDate < startDate;
        const isScheduled = selectedDays.includes(dayOfWeek);

        let status: 'completed' | 'missed' | 'not-scheduled' | 'future';
        if (!isScheduled || isBeforeStart) {
          status = 'not-scheduled';
        } else if (isFuture) {
          status = 'future';
        } else {
          scheduledCount++;
          if (history[dateStr]) {
            status = 'completed';
            completedCount++;
          } else {
            status = 'missed';
          }
        }
        week.push({ date: dayDate, status });
      }

      weeksData.push({ days: week, month: monthName, showMonth, completedCount, scheduledCount });
      current.setDate(current.getDate() + 7);
      if (weeksData.length > 104) break;
    }

    const reversed = weeksData.reverse();
    let lastMonthYear = '';
    reversed.forEach(week => {
      const firstDay = week.days[0].date;
      const monthYear = `${firstDay.getMonth()}-${firstDay.getFullYear()}`;
      week.showMonth = monthYear !== lastMonthYear;
      if (week.showMonth) {
        lastMonthYear = monthYear;
        const ys = firstDay.getFullYear().toString().slice(-2);
        week.month = `${firstDay.toLocaleDateString('en-US', { month: 'short' })} ${ys}`;
      }
    });
    return reversed;
  }, [selectedDays, completionHistory, startDate]);

  const stats = useMemo(() => {
    let totalScheduled = 0;
    let totalCompleted = 0;
    const dayStats: { scheduled: number; completed: number }[] = Array(7).fill(null).map(() => ({ scheduled: 0, completed: 0 }));

    weeks.forEach(week => {
      totalScheduled += week.scheduledCount;
      totalCompleted += week.completedCount;
      week.days.forEach((day, dayIndex) => {
        if (day.status === 'completed') {
          dayStats[dayIndex].scheduled++;
          dayStats[dayIndex].completed++;
        } else if (day.status === 'missed') {
          dayStats[dayIndex].scheduled++;
        }
      });
    });

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let bestDayIndex = 0;
    let bestDayRate = 0;
    dayStats.forEach((stat, index) => {
      if (stat.scheduled > 0) {
        const rate = stat.completed / stat.scheduled;
        if (rate > bestDayRate) {
          bestDayRate = rate;
          bestDayIndex = index;
        }
      }
    });

    const completionPercent = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    return {
      totalCompleted,
      totalScheduled,
      completionPercent,
      bestDay: dayNames[bestDayIndex],
      bestDayPercent: Math.round(bestDayRate * 100),
    };
  }, [weeks]);

  const gridDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Task name header */}
      {taskName && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: colors.textPrimary, flex: 1, marginRight: spacing.md, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{taskName}</span>
          {onDone && (
            <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: colors.textMuted, padding: spacing.sm }}>Done</button>
          )}
        </div>
      )}

      {/* Stats Card - OVERVIEW */}
      <div style={gridStyles.card}>
        <span style={gridStyles.cardTitle}>OVERVIEW</span>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 8, paddingBottom: 8 }}>
          <ProgressRingWeb percent={stats.completionPercent} label={`${stats.completionPercent}%`} sublabel={`Task: ${stats.totalCompleted}/${stats.totalScheduled}`} />
          <ProgressRingWeb percent={stats.bestDayPercent} label={stats.bestDay} sublabel={`Best day: ${stats.bestDayPercent}%`} />
          <ProgressRingWeb percent={Math.min(100, (stats.totalCompleted / 30) * 100)} label={`${stats.totalCompleted}`} sublabel="Days Tracked" />
        </div>
      </div>

      {/* Legend Card */}
      <div style={gridStyles.card}>
        <span style={gridStyles.cardTitle}>LEGEND</span>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: goalColor.main }} />
            <span style={{ fontSize: 12, color: '#666666' }}>Completed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: '#2A2A2A' }} />
            <span style={{ fontSize: 12, color: '#666666' }}>Incomplete</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: '#000000', border: `1px solid ${colors.border}` }} />
            <span style={{ fontSize: 12, color: '#666666' }}>Not Scheduled</span>
          </div>
        </div>
      </div>

      {/* Grid Card */}
      <div style={{ ...gridStyles.card, flex: 1, paddingBottom: 8 }}>
        <span style={gridStyles.cardTitle}>GRID</span>
        {/* Header row with day labels */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: DOT_GAP }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 48 }} />
            {gridDayLabels.map((label, i) => (
              <div key={i} style={{ width: DOT_SIZE, marginRight: i < 6 ? DOT_GAP : 0, textAlign: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#666666' }}>{label}</span>
              </div>
            ))}
            <div style={{ width: 44 }} />
          </div>
        </div>

        {/* Scrollable weeks */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: DOT_GAP }}>
                {/* Month label */}
                <div style={{ width: 48, display: 'flex', justifyContent: 'flex-start' }}>
                  {week.showMonth && (
                    <span style={{ fontSize: 11, color: '#666666' }}>{week.month}</span>
                  )}
                </div>
                {/* Days */}
                {week.days.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    title={`${formatDate(day.date)}: ${day.status === 'completed' ? 'Completed' : day.status === 'missed' ? 'Missed' : day.status}`}
                    style={{
                      width: DOT_SIZE,
                      height: DOT_SIZE,
                      borderRadius: 4,
                      marginRight: dayIndex < 6 ? DOT_GAP : 0,
                      backgroundColor:
                        day.status === 'completed'
                          ? goalColor.main
                          : day.status === 'not-scheduled' || day.status === 'future'
                          ? '#000000'
                          : '#2A2A2A',
                    }}
                  />
                ))}
                {/* Completion ratio */}
                <div style={{ width: 44, textAlign: 'right', paddingLeft: 8 }}>
                  {week.scheduledCount > 0 && (
                    <span style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: week.completedCount === week.scheduledCount ? goalColor.main : '#666666',
                    }}>
                      {week.completedCount}/{week.scheduledCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const gridStyles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    border: '1px solid #1A1A1A',
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
};

// ============================================
// Styles (matching mobile StyleSheet exactly)
// ============================================
const s: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    backgroundColor: colors.elevated,
    height: '100%',
    overflow: 'hidden',
  },
  dragHandleWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    cursor: 'grab',
    flexShrink: 0,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.md,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cancelButton: {
    fontSize: 15,
    color: colors.textMuted,
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  tabSelector: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
    marginBottom: spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  tabButtonActive: {
    backgroundColor: colors.border,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 80,
    overflowY: 'auto',
    flex: 1,
  },
  historyContent: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: 40,
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  field: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    fontWeight: 500,
  },
  textInput: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingLeft: 18,
    paddingRight: 18,
    color: colors.textPrimary,
    fontSize: 16,
    outline: 'none',
  },
  targetInputRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetInput: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingLeft: 14,
    paddingRight: 14,
    color: colors.textPrimary,
    fontSize: 16,
    width: 90,
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box',
  },
  targetHint: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  typeCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  segmentControl: {
    display: 'flex',
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  segmentButtonActive: {
    backgroundColor: colors.border,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textMuted,
  },
  segmentButtonTextActive: {
    color: colors.textPrimary,
  },
  typeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
    marginRight: spacing.md,
  },
  typePreview: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  previewLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  previewCheckboxChecked: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  previewNumeric: {
    width: 60,
    height: 32,
    backgroundColor: colors.elevated,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewNumericText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  frequencyRow: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  frequencyButton: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 10,
    textAlign: 'center',
    borderRadius: borderRadius.md,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  frequencyButtonActive: {
    backgroundColor: colors.border,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: 500,
    color: colors.textMuted,
  },
  frequencyTextActive: {
    color: colors.textPrimary,
  },
  dayPicker: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
  dayButtonActive: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textFaint,
  },
  dayButtonTextActive: {
    color: colors.textPrimary,
  },
  segmentControlStandalone: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  goalDropdown: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
  },
  goalSelected: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  goalSelectedName: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: 500,
  },
  dropdownArrow: {
    fontSize: 18,
    color: colors.textMuted,
  },
  saveButton: {
    width: '100%',
    padding: 12,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.xl,
    textAlign: 'center',
    marginTop: spacing.md,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  deleteButton: {
    width: '100%',
    padding: 12,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.xl,
    textAlign: 'center',
    marginTop: spacing.md,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.textMuted,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 2147483647,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalTitle: {
    display: 'block',
    fontSize: 18,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  goalOption: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
  },
  goalOptionSelected: {
    backgroundColor: colors.border,
  },
  goalOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
    flexShrink: 0,
  },
  goalOptionText: {
    flex: 1,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'left',
  },
  goalOptionTextSelected: {
    color: colors.textPrimary,
    fontWeight: 500,
  },
  notFoundContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  },
  closeButton: {
    backgroundColor: colors.elevated,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 12,
    paddingLeft: 32,
    paddingRight: 32,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
