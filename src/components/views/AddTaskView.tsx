'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTasks } from '@/contexts/TaskContext';
import ModalPortal from '@/components/ui/ModalPortal';
import { useGoals } from '@/contexts/GoalContext';
import { getGoalColor } from '@/shared';

type TaskType = 'checkbox' | 'number';
type Importance = 'medium' | 'high' | 'maximum';
type Difficulty = 'medium' | 'high' | 'maximum';
type Frequency = '1x' | '2x' | '3x' | '4x' | '5x' | '6x' | 'daily';

const FREQUENCIES: Frequency[] = ['1x', '2x', '3x', '4x', '5x', '6x', 'daily'];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Theme values from mobile
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

interface AddTaskViewProps {
  onBack?: () => void;
  createdAt?: string;
}

const FOUNDATIONS = { id: 0, name: 'Foundations', priority: 99 };

export default function AddTaskView({ onBack, createdAt }: AddTaskViewProps) {
  const { addTask } = useTasks();
  const { goals: allGoals } = useGoals();

  const goals = allGoals.filter(g => !g.completed);

  // Get the #1 priority goal (lowest priority number) or Foundations if no goals
  const getDefaultGoal = () => {
    if (goals.length === 0) return FOUNDATIONS;
    const sorted = [...goals].sort((a, b) => a.priority - b.priority);
    return sorted[0];
  };

  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('checkbox');
  const [target, setTarget] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [importance, setImportance] = useState<Importance>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [selectedGoal, setSelectedGoal] = useState<{ id: number; name: string; priority: number }>(FOUNDATIONS);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSetInitialGoal, setHasSetInitialGoal] = useState(false);

  // Set default goal to #1 priority goal when goals load
  useEffect(() => {
    if (!hasSetInitialGoal && goals.length > 0) {
      const defaultGoal = getDefaultGoal();
      setSelectedGoal(defaultGoal);
      setHasSetInitialGoal(true);
    }
  }, [goals, hasSetInitialGoal]);

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
  }, [isPulling, pullOffset, onBack]);

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

  const getRequiredDays = (freq: Frequency): number => {
    if (freq === 'daily') return 7;
    return parseInt(freq.replace('x', ''), 10);
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  const handleCancel = () => {
    onBack?.();
  };

  const handleSave = async () => {
    if (!taskName.trim()) {
      alert('Please enter a name for your task.');
      return;
    }

    if (taskType === 'number') {
      const targetNum = parseInt(target, 10);
      if (!target.trim() || isNaN(targetNum) || targetNum <= 0) {
        alert('Please enter a minimum completion amount for this numeric task.');
        return;
      }
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

    setIsSubmitting(true);
    await addTask({
      name: taskName,
      type: taskType,
      frequency,
      selectedDays,
      importance,
      difficulty,
      goalId: selectedGoal.id,
      goalPriority: selectedGoal.priority,
      completed: false,
      target: taskType === 'number' ? parseInt(target, 10) : undefined,
      displayOrder: 0,
    }, createdAt);
    onBack?.();
  };

  const goalColor = selectedGoal ? getGoalColor(selectedGoal.priority) : getGoalColor(99);

  return (
    <div style={{
      ...styles.container,
      transform: isDismissing ? 'translateY(100vh)' : pullOffset > 0 ? `translateY(${pullOffset}px)` : undefined,
      transition: isDismissing ? 'transform 350ms ease-in' : isPulling ? 'none' : 'transform 200ms ease-out',
    }}>
      {/* Drag Handle — pull down to dismiss */}
      <div
        style={styles.dragHandleWrapper}
        onMouseDown={(e) => { e.preventDefault(); handlePullStart(e.clientY); }}
        onTouchStart={(e) => handlePullStart(e.touches[0].clientY)}
      >
        <div style={styles.dragHandle} />
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>Add Task</div>
        <button onClick={handleCancel} style={styles.cancelButton}>
          Cancel
        </button>
      </div>

      {/* Scrollable Content */}
      <div style={styles.scrollView}>
        <div style={styles.scrollContent}>

          {/* Linked Goal */}
          <div style={styles.field}>
            <div style={styles.fieldLabel}>LINKED GOAL</div>
            <button
              type="button"
              onClick={() => setShowGoalPicker(true)}
              style={styles.goalDropdown}
            >
              <div style={styles.goalSelected}>
                <div
                  style={{
                    ...styles.goalColorDot,
                    backgroundColor: goalColor.main,
                  }}
                />
                <span style={styles.goalSelectedName}>{selectedGoal.name}</span>
              </div>
              <span style={styles.dropdownArrow}>{'\u203A'}</span>
            </button>
          </div>

          {/* Task Name */}
          <div style={styles.field}>
            <div style={styles.fieldLabel}>TASK NAME</div>
            <input
              type="text"
              style={styles.textInput}
              placeholder="What do you need to do?"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
            />
          </div>

          {/* Task Type */}
          <div style={styles.field}>
            <div style={styles.fieldLabel}>TASK TYPE</div>
            <div style={styles.typeCard}>
              <div style={styles.segmentControl}>
                {(['checkbox', 'number'] as TaskType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTaskType(type)}
                    style={{
                      ...styles.segmentButton,
                      ...(taskType === type ? styles.segmentButtonActive : {}),
                    }}
                  >
                    <span
                      style={{
                        ...styles.segmentButtonText,
                        ...(taskType === type ? styles.segmentButtonTextActive : {}),
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
              <div style={styles.typeDivider} />
              <div style={styles.typePreview}>
                <span style={styles.previewLabel}>Preview</span>
                {taskType === 'checkbox' ? (
                  <div style={{ ...styles.previewCheckbox, backgroundColor: goalColor.main }} />
                ) : (
                  <div style={{ ...styles.previewNumeric, borderColor: goalColor.main }}>
                    <span style={styles.previewNumericText}>0</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Minimum Completion (only for numeric tasks) */}
          {taskType === 'number' && (
            <div style={styles.field}>
              <div style={styles.fieldLabel}>MINIMUM TO COMPLETE</div>
              <div style={styles.targetInputRow}>
                <input
                  type="text"
                  style={styles.targetInput}
                  placeholder="2000"
                  value={target}
                  onChange={e => setTarget(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <span style={styles.targetHint}>or more to complete</span>
              </div>
            </div>
          )}

          {/* Frequency */}
          <div style={styles.field}>
            <div style={styles.fieldLabel}>FREQUENCY</div>
            <div style={styles.frequencyRow}>
              {FREQUENCIES.map(freq => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => {
                    setFrequency(freq);
                    if (freq === 'daily') {
                      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
                    } else if (frequency === 'daily' || frequency !== freq) {
                      setSelectedDays([]);
                    }
                  }}
                  style={{
                    ...styles.frequencyButton,
                    ...(frequency === freq ? styles.frequencyButtonActive : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.frequencyText,
                      ...(frequency === freq ? styles.frequencyTextActive : {}),
                    }}
                  >
                    {freq === 'daily' ? '7x' : freq}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Which Days */}
          {frequency !== 'daily' && (
            <div style={styles.field}>
              <div style={styles.fieldLabel}>WHICH DAYS</div>
              <div style={styles.dayPicker}>
                {DAY_LABELS.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    style={{
                      ...styles.dayButton,
                      ...(selectedDays.includes(index) ? styles.dayButtonActive : {}),
                    }}
                  >
                    <span
                      style={{
                        ...styles.dayButtonText,
                        ...(selectedDays.includes(index) ? styles.dayButtonTextActive : {}),
                      }}
                    >
                      {day}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Importance */}
          <div style={styles.field}>
            <div style={styles.fieldLabel}>IMPORTANCE</div>
            <div style={styles.segmentControlStandalone}>
              {(['medium', 'high', 'maximum'] as Importance[]).map(imp => (
                <button
                  key={imp}
                  type="button"
                  onClick={() => setImportance(imp)}
                  style={{
                    ...styles.segmentButton,
                    ...(importance === imp ? styles.segmentButtonActive : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.segmentButtonText,
                      ...(importance === imp ? styles.segmentButtonTextActive : {}),
                    }}
                  >
                    {imp.charAt(0).toUpperCase() + imp.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div style={styles.field}>
            <div style={styles.fieldLabel}>DIFFICULTY</div>
            <div style={styles.segmentControlStandalone}>
              {(['medium', 'high', 'maximum'] as Difficulty[]).map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  style={{
                    ...styles.segmentButton,
                    ...(difficulty === diff ? styles.segmentButtonActive : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.segmentButtonText,
                      ...(difficulty === diff ? styles.segmentButtonTextActive : {}),
                    }}
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            style={{
              ...styles.saveButton,
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            <span style={styles.saveButtonText}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </span>
          </button>
        </div>
      </div>

      {/* Goal Picker Modal - rendered via ModalPortal to ensure it's always on top */}
      <ModalPortal isOpen={showGoalPicker}>
        <div
          style={styles.modalOverlay}
          onClick={() => setShowGoalPicker(false)}
        >
          <div
            style={styles.modalContent}
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.modalTitle}>Select Goal</div>
            {/* User goals */}
            {goals.map(goal => {
              const color = getGoalColor(goal.priority);
              const isSelected = selectedGoal.id === goal.id;
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => {
                    setSelectedGoal(goal);
                    setShowGoalPicker(false);
                  }}
                  style={{
                    ...styles.goalOption,
                    ...(isSelected ? styles.goalOptionSelected : {}),
                  }}
                >
                  <div style={{ ...styles.goalOptionDot, backgroundColor: color.main }} />
                  <span
                    style={{
                      ...styles.goalOptionText,
                      ...(isSelected ? styles.goalOptionTextSelected : {}),
                    }}
                  >
                    {goal.name}
                  </span>
                </button>
              );
            })}
            {/* Foundations option - always last */}
            {(() => {
              const foundationsColor = getGoalColor(FOUNDATIONS.priority);
              const isSelected = selectedGoal.id === FOUNDATIONS.id;
              return (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGoal(FOUNDATIONS);
                    setShowGoalPicker(false);
                  }}
                  style={{
                    ...styles.goalOption,
                    ...(isSelected ? styles.goalOptionSelected : {}),
                  }}
                >
                  <div style={{ ...styles.goalOptionDot, backgroundColor: foundationsColor.main }} />
                  <span
                    style={{
                      ...styles.goalOptionText,
                      ...(isSelected ? styles.goalOptionTextSelected : {}),
                    }}
                  >
                    Foundations
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    backgroundColor: colors.elevated,
    minHeight: '100%',
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
    position: 'relative',
    zIndex: 10,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  cancelButton: {
    fontSize: 15,
    color: colors.textMuted,
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  scrollView: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  field: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    fontWeight: 500,
  },
  textInput: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingLeft: 18,
    paddingRight: 18,
    color: colors.textPrimary,
    fontSize: 16,
    width: '100%',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  targetInputRow: {
    display: 'flex',
    flexDirection: 'row' as const,
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
    textAlign: 'center' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
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
    overflow: 'hidden' as const,
  },
  segmentControl: {
    display: 'flex',
    flexDirection: 'row' as const,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    borderRadius: borderRadius.md,
    textAlign: 'center' as const,
    backgroundColor: 'transparent',
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
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  previewLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  previewCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  previewNumeric: {
    width: 60,
    height: 32,
    backgroundColor: colors.elevated,
    border: `2px solid ${colors.borderLight}`,
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
    flexDirection: 'row' as const,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  frequencyButton: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 10,
    textAlign: 'center' as const,
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
    flexDirection: 'row' as const,
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
    flexDirection: 'row' as const,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  goalDropdown: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
    background: colors.card,
  },
  goalSelected: {
    display: 'flex',
    flexDirection: 'row' as const,
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
    textAlign: 'center' as const,
    marginTop: spacing.md,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  modalOverlay: {
    position: 'fixed' as const,
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
    fontSize: 18,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center' as const,
  },
  goalOption: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    background: 'none',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
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
    textAlign: 'left' as const,
  },
  goalOptionTextSelected: {
    color: colors.textPrimary,
    fontWeight: 500,
  },
};
