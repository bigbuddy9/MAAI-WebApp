'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGoals } from '@/contexts/GoalContext';

interface GoalEditViewProps {
  goalId: number;
  onBack?: () => void;
  onDeleted?: () => void;
}

interface Milestone {
  id?: number;
  description: string;
  targetDate: Date;
  completed?: boolean;
}

const colors = {
  background: '#0A0A0A',
  card: '#0D0D0D',
  elevated: '#111111',
  border: '#1A1A1A',
  borderLight: '#333333',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1A1',
  textMuted: '#6B6B6B',
  cyan: '#00FFFF',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/* ─── Custom Date Picker (matches mobile) ─── */
function CustomDatePicker({
  value,
  onChange,
  minimumDate,
}: {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());

  const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isDateDisabled = (month: number, day: number, year: number) => {
    if (!minimumDate) return false;
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    const min = new Date(minimumDate);
    min.setHours(0, 0, 0, 0);
    return date < min;
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    const newDays = getDaysInMonth(month, selectedYear);
    const newDay = Math.min(selectedDay, newDays);
    setSelectedDay(newDay);
    onChange(new Date(selectedYear, month, newDay));
  };

  const handleDayChange = (day: number) => {
    setSelectedDay(day);
    onChange(new Date(selectedYear, selectedMonth, day));
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const newDays = getDaysInMonth(selectedMonth, year);
    const newDay = Math.min(selectedDay, newDays);
    setSelectedDay(newDay);
    onChange(new Date(year, selectedMonth, newDay));
  };

  return (
    <div style={dpStyles.container}>
      {/* Month */}
      <div style={dpStyles.column}>
        <span style={dpStyles.columnLabel}>Month</span>
        <div style={dpStyles.scrollColumn}>
          {MONTHS.map((month, index) => {
            const disabled = isDateDisabled(index, selectedDay, selectedYear);
            const selected = selectedMonth === index;
            return (
              <button
                key={month}
                style={{
                  ...dpStyles.option,
                  ...(selected ? dpStyles.optionSelected : {}),
                  ...(disabled ? { opacity: 0.3 } : {}),
                }}
                onClick={() => !disabled && handleMonthChange(index)}
                disabled={disabled}
              >
                <span style={{
                  ...dpStyles.optionText,
                  ...(selected ? { fontWeight: 600 } : {}),
                  ...(disabled ? { color: colors.textMuted } : {}),
                }}>{month}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day */}
      <div style={dpStyles.column}>
        <span style={dpStyles.columnLabel}>Day</span>
        <div style={dpStyles.scrollColumn}>
          {days.map((day) => {
            const disabled = isDateDisabled(selectedMonth, day, selectedYear);
            const selected = selectedDay === day;
            return (
              <button
                key={day}
                style={{
                  ...dpStyles.option,
                  ...(selected ? dpStyles.optionSelected : {}),
                  ...(disabled ? { opacity: 0.3 } : {}),
                }}
                onClick={() => !disabled && handleDayChange(day)}
                disabled={disabled}
              >
                <span style={{
                  ...dpStyles.optionText,
                  ...(selected ? { fontWeight: 600 } : {}),
                  ...(disabled ? { color: colors.textMuted } : {}),
                }}>{day}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Year */}
      <div style={dpStyles.column}>
        <span style={dpStyles.columnLabel}>Year</span>
        <div style={dpStyles.scrollColumn}>
          {years.map((year) => {
            const disabled = isDateDisabled(selectedMonth, selectedDay, year);
            const selected = selectedYear === year;
            return (
              <button
                key={year}
                style={{
                  ...dpStyles.option,
                  ...(selected ? dpStyles.optionSelected : {}),
                  ...(disabled ? { opacity: 0.3 } : {}),
                }}
                onClick={() => !disabled && handleYearChange(year)}
                disabled={disabled}
              >
                <span style={{
                  ...dpStyles.optionText,
                  ...(selected ? { fontWeight: 600 } : {}),
                  ...(disabled ? { color: colors.textMuted } : {}),
                }}>{year}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const dpStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  columnLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  scrollColumn: {
    height: 180,
    backgroundColor: colors.elevated,
    borderRadius: 8,
    overflowY: 'auto',
  },
  option: {
    padding: '10px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: '2px 4px',
    border: '1px solid transparent',
    background: 'none',
    cursor: 'pointer',
    width: 'calc(100% - 8px)',
  },
  optionSelected: {
    backgroundColor: colors.card,
    borderColor: colors.borderLight,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
};

/* ─── Format date ─── */
const formatDate = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/* ─── Auto-resize textarea ─── */
const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement> | HTMLTextAreaElement) => {
  const textarea = 'target' in e ? e.target : e;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
};

/* ─── Main Component ─── */
export default function GoalEditView({ goalId, onBack, onDeleted }: GoalEditViewProps) {
  const { goals, updateGoal, deleteGoal } = useGoals();

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

  const existingGoal = goals.find(g => g.id === goalId);

  // Form state
  const [goalName, setGoalName] = useState('');
  const [completionCriteria, setCompletionCriteria] = useState('');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState<Date | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [why, setWhy] = useState('');
  const [reward, setReward] = useState('');
  const [futureMessage, setFutureMessage] = useState('');
  const [committed, setCommitted] = useState(false);

  // Error / modal state
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'target' | 'milestone'>('target');
  const [tempDate, setTempDate] = useState(new Date());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompletedWarning, setShowCompletedWarning] = useState(false);

  // Textarea refs for auto-resize
  const completionRef = useRef<HTMLTextAreaElement>(null);
  const whyRef = useRef<HTMLTextAreaElement>(null);
  const rewardRef = useRef<HTMLTextAreaElement>(null);
  const futureRef = useRef<HTMLTextAreaElement>(null);

  // Initialize from existing goal
  useEffect(() => {
    if (existingGoal) {
      setGoalName(existingGoal.name);
      setCompletionCriteria(existingGoal.completionCriteria);
      setTargetDate(new Date(existingGoal.targetDate));
      setMilestones(existingGoal.milestones.map(m => ({
        id: m.id,
        description: m.description,
        targetDate: new Date(m.targetDate),
        completed: m.completed,
      })));
      setWhy(existingGoal.why);
      setReward(existingGoal.reward);
      setFutureMessage(existingGoal.futureMessage || '');
      setCommitted(existingGoal.committed);

      // Auto-resize textareas after data loads
      setTimeout(() => {
        if (completionRef.current) autoResize(completionRef.current);
        if (whyRef.current) autoResize(whyRef.current);
        if (rewardRef.current) autoResize(rewardRef.current);
        if (futureRef.current) autoResize(futureRef.current);
      }, 0);
    }
  }, [existingGoal?.id]);

  if (!existingGoal) {
    return (
      <div style={{
        ...styles.container,
        transform: isDismissing ? 'translateY(100vh)' : pullOffset > 0 ? `translateY(${pullOffset}px)` : undefined,
        transition: isDismissing ? 'transform 350ms ease-in' : isPulling ? 'none' : 'transform 200ms ease-out',
      }}>
        <div style={styles.modalSheet}>
          <div
            style={{ ...styles.pullIndicatorContainer, cursor: 'grab' }}
            onMouseDown={(e) => { e.preventDefault(); handlePullStart(e.clientY); }}
            onTouchStart={(e) => handlePullStart(e.touches[0].clientY)}
          >
            <div style={styles.pullIndicator} />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: colors.textMuted, fontSize: 15 }}>Goal not found</span>
          </div>
        </div>
      </div>
    );
  }

  const isCompletedGoal = existingGoal.completed;

  const filledFields = [
    goalName.trim(),
    completionCriteria.trim(),
    targetDate !== null,
    isCompletedGoal ? true : milestones.length > 0,
    why.trim(),
    reward.trim(),
    futureMessage.trim(),
    committed,
  ].filter(Boolean).length;

  const isValid = filledFields === 8;

  const openDatePicker = (mode: 'target' | 'milestone') => {
    setDatePickerMode(mode);
    if (mode === 'target' && targetDate) {
      setTempDate(targetDate);
    } else if (mode === 'milestone' && newMilestoneDate) {
      setTempDate(newMilestoneDate);
    } else {
      setTempDate(new Date());
    }
    setShowDatePicker(true);
  };

  const confirmDateSelection = () => {
    if (datePickerMode === 'target') {
      setTargetDate(tempDate);
    } else {
      setNewMilestoneDate(tempDate);
    }
    setShowDatePicker(false);
  };

  const addMilestone = () => {
    setMilestoneError(null);
    if (!newMilestone.trim()) {
      setMilestoneError('Please enter a milestone description');
      return;
    }
    if (!newMilestoneDate) {
      setMilestoneError('Please select a milestone date');
      return;
    }
    if (targetDate) {
      const milestoneTime = new Date(newMilestoneDate).setHours(0, 0, 0, 0);
      const targetTime = new Date(targetDate).setHours(0, 0, 0, 0);
      if (milestoneTime >= targetTime) {
        setMilestoneError('Milestone date must be before the goal target date');
        return;
      }
    }
    const newId = Math.max(0, ...milestones.map(m => m.id || 0)) + 1;
    setMilestones([...milestones, { id: newId, description: newMilestone, targetDate: newMilestoneDate, completed: false }]);
    setNewMilestone('');
    setNewMilestoneDate(null);
    setShowAddMilestone(false);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!isValid || !targetDate) return;
    if (existingGoal.completed) {
      setShowCompletedWarning(true);
      return;
    }
    saveChanges();
  };

  const saveChanges = () => {
    if (!targetDate) return;
    const formattedMilestones = milestones.map((m, index) => ({
      id: m.id || index + 1,
      description: m.description,
      targetDate: m.targetDate,
      completed: m.completed || false,
    }));
    updateGoal(goalId, {
      name: goalName.trim(),
      completionCriteria: completionCriteria.trim(),
      targetDate: targetDate,
      milestones: formattedMilestones,
      why: why.trim(),
      reward: reward.trim(),
      futureMessage: futureMessage.trim() || undefined,
      committed: committed,
    });
    onBack?.();
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    deleteGoal(goalId);
    onDeleted?.();
  };

  return (
    <div style={{
      ...styles.container,
      transform: isDismissing ? 'translateY(100vh)' : pullOffset > 0 ? `translateY(${pullOffset}px)` : undefined,
      transition: isDismissing ? 'transform 350ms ease-in' : isPulling ? 'none' : 'transform 200ms ease-out',
    }}>
      <div style={styles.modalSheet}>
        {/* Pull indicator */}
        <div
          style={{ ...styles.pullIndicatorContainer, cursor: 'grab' }}
          onClick={() => onBack?.()}
          onMouseDown={(e) => { e.preventDefault(); handlePullStart(e.clientY); }}
          onTouchStart={(e) => handlePullStart(e.touches[0].clientY)}
        >
          <div style={styles.pullIndicator} />
        </div>

        {/* Header */}
        <div style={styles.header}>
          <button style={styles.cancelBtn} onClick={() => onBack?.()}>
            <span style={styles.cancelBtnText}>Cancel</span>
          </button>
          <span style={styles.headerTitle}>Edit Goal</span>
          <div style={{ width: 50 }} />
        </div>

        {/* Progress dots */}
        <div style={styles.progressDots}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                ...(i < filledFields ? { backgroundColor: colors.cyan } : {}),
              }}
            />
          ))}
        </div>

        <div style={styles.scrollView}>
          <div style={styles.scrollContent}>
            {/* Goal Name */}
            <div style={styles.field}>
              <span style={styles.fieldLabel}>Goal</span>
              <input
                style={styles.textInput}
                placeholder="What do you want to achieve?"
                value={goalName}
                onChange={e => setGoalName(e.target.value)}
              />
            </div>

            {/* Completion Criteria */}
            <div style={styles.field}>
              <span style={styles.fieldLabel}>Completion Criteria</span>
              <textarea
                ref={completionRef}
                style={{ ...styles.textInput, ...styles.textArea }}
                placeholder="How will you know when this goal is complete?"
                value={completionCriteria}
                onChange={e => { setCompletionCriteria(e.target.value); autoResize(e); }}
              />
            </div>

            {/* Target Date */}
            <div style={styles.field}>
              <span style={styles.fieldLabel}>Target Date</span>
              <button
                style={styles.datePickerButton}
                onClick={() => openDatePicker('target')}
              >
                <span style={{
                  ...styles.datePickerText,
                  ...(!targetDate ? { color: colors.textMuted } : {}),
                }}>
                  {targetDate ? formatDate(targetDate) : 'Select target date'}
                </span>
              </button>
            </div>

            {/* Milestones */}
            <div style={styles.field}>
              <span style={styles.fieldLabel}>Milestones</span>

              {milestones.map((milestone, index) => (
                <div key={milestone.id || index} style={styles.milestoneItem}>
                  <div style={{
                    ...styles.milestoneCircle,
                    ...(milestone.completed ? {
                      backgroundColor: colors.cyan,
                      borderColor: colors.cyan,
                    } : {}),
                  }} />
                  <div style={styles.milestoneContent}>
                    <span style={styles.milestoneText}>{milestone.description}</span>
                    <span style={styles.milestoneDate}>{formatDate(milestone.targetDate)}</span>
                  </div>
                  <button
                    style={styles.milestoneRemove}
                    onClick={() => removeMilestone(index)}
                  >
                    <span style={styles.milestoneRemoveText}>&times;</span>
                  </button>
                </div>
              ))}

              {!isCompletedGoal && (
                showAddMilestone ? (
                  <div style={{ marginTop: 8 }}>
                    <input
                      style={styles.textInput}
                      placeholder="Milestone description"
                      value={newMilestone}
                      onChange={e => { setNewMilestone(e.target.value); setMilestoneError(null); }}
                    />
                    <button
                      style={{ ...styles.datePickerButton, marginTop: 12 }}
                      onClick={() => openDatePicker('milestone')}
                    >
                      <span style={{
                        ...styles.datePickerText,
                        ...(!newMilestoneDate ? { color: colors.textMuted } : {}),
                      }}>
                        {newMilestoneDate ? formatDate(newMilestoneDate) : 'Select milestone date'}
                      </span>
                    </button>
                    {milestoneError && (
                      <span style={{ color: '#ef4444', fontSize: 13, marginTop: 8, display: 'block' }}>{milestoneError}</span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                      <button
                        style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}
                        onClick={() => { setShowAddMilestone(false); setNewMilestone(''); setNewMilestoneDate(null); setMilestoneError(null); }}
                      >
                        <span style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</span>
                      </button>
                      <button
                        style={{ backgroundColor: colors.elevated, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
                        onClick={addMilestone}
                      >
                        <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>Add</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    style={styles.addMilestoneButton}
                    onClick={() => setShowAddMilestone(true)}
                  >
                    <div style={styles.addMilestoneCircle} />
                    <span style={{ color: colors.textMuted, fontSize: 14 }}>Add milestone</span>
                  </button>
                )
              )}
              {isCompletedGoal && milestones.length === 0 && (
                <span style={{ color: colors.textMuted, fontSize: 14, fontStyle: 'italic' }}>No milestones were set for this goal</span>
              )}
            </div>

            {/* Why This Matters */}
            <div style={styles.field}>
              <span style={styles.fieldLabel}>Why This Matters</span>
              <textarea
                ref={whyRef}
                style={{ ...styles.textInput, ...styles.textArea }}
                placeholder="Why is this goal important to you?"
                value={why}
                onChange={e => { setWhy(e.target.value); autoResize(e); }}
              />
            </div>

            {/* Reward */}
            <div style={styles.field}>
              <span style={styles.fieldLabel}>Your Reward</span>
              <textarea
                ref={rewardRef}
                style={{ ...styles.textInput, ...styles.textArea }}
                placeholder="What will you reward yourself with?"
                value={reward}
                onChange={e => { setReward(e.target.value); autoResize(e); }}
              />
            </div>

            {/* Note to Future Self */}
            <div style={styles.field}>
              <span style={styles.fieldLabel}>Note to Future Self</span>
              <textarea
                ref={futureRef}
                style={{ ...styles.textInput, ...styles.textArea }}
                placeholder="Message to self upon completion..."
                value={futureMessage}
                onChange={e => { setFutureMessage(e.target.value); autoResize(e); }}
              />
            </div>

            {/* Commitment Checkbox */}
            <button
              style={{
                ...styles.commitmentBox,
                ...(committed ? { borderColor: `${colors.cyan}66` } : {}),
              }}
              onClick={() => setCommitted(!committed)}
            >
              <div style={{
                ...styles.commitmentCircle,
                ...(committed ? { borderColor: colors.cyan, backgroundColor: colors.cyan } : {}),
              }} />
              <div style={styles.commitmentContent}>
                <span style={{
                  ...styles.commitmentTitle,
                  ...(committed ? { color: colors.textPrimary } : {}),
                }}>
                  I&apos;m fully committed to this goal.
                </span>
                <span style={styles.commitmentText}>
                  No excuses. No backing out.{'\n'}
                  I am 100% accountable.{'\n'}
                  I will do what&apos;s required.
                </span>
              </div>
            </button>

            {/* Save Changes Button */}
            <button style={styles.saveButton} onClick={handleSave}>
              <span style={styles.saveButtonText}>Save Changes</span>
            </button>

            {/* Delete Goal Button */}
            <button style={styles.deleteButton} onClick={() => setShowDeleteConfirm(true)}>
              <span style={styles.deleteButtonText}>Delete Goal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div style={styles.overlay} onClick={() => setShowDatePicker(false)}>
          <div style={styles.datePickerModal} onClick={e => e.stopPropagation()}>
            <div style={styles.datePickerHeader}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowDatePicker(false)}>
                <span style={{ color: colors.textMuted, fontSize: 16 }}>Cancel</span>
              </button>
              <span style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 600 }}>
                {datePickerMode === 'target' ? 'Target Date' : 'Milestone Date'}
              </span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={confirmDateSelection}>
                <span style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 600 }}>Done</span>
              </button>
            </div>
            <CustomDatePicker
              value={tempDate}
              onChange={setTempDate}
              minimumDate={new Date()}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.overlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <span style={styles.confirmTitle}>
              {isCompletedGoal ? 'Delete Completed Goal?' : 'Delete Goal?'}
            </span>
            <span style={styles.confirmSubtitle}>
              {isCompletedGoal
                ? `This is a completed goal. You already achieved "${existingGoal.name}" — are you sure you want to delete this from your history?`
                : `This will permanently delete "${existingGoal.name}" and all its associated data. This action cannot be undone.`
              }
            </span>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={styles.confirmCancelBtn} onClick={() => setShowDeleteConfirm(false)}>
                <span style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>Cancel</span>
              </button>
              <button style={styles.confirmDeleteBtn} onClick={confirmDelete}>
                <span style={{ color: colors.textMuted, fontSize: 15, fontWeight: 600 }}>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Goal Warning */}
      {showCompletedWarning && (
        <div style={styles.overlay} onClick={() => setShowCompletedWarning(false)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <span style={styles.confirmTitle}>Cannot Edit</span>
            <span style={styles.confirmSubtitle}>
              This goal has already been completed. Completed goals cannot be edited.
            </span>
            <button
              style={{ ...styles.confirmCancelBtn, flex: 'unset', width: '100%' }}
              onClick={() => setShowCompletedWarning(false)}
            >
              <span style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>Got it</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Styles ─── */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    height: '100%',
    backgroundColor: 'transparent',
  },
  modalSheet: {
    backgroundColor: '#0D0D0D',
    height: '100%',
    paddingTop: 20,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  pullIndicatorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    cursor: 'pointer',
  },
  pullIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: 500,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 600,
  },
  progressDots: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  scrollView: {
    flex: 1,
    overflowY: 'auto',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  field: {
    backgroundColor: colors.elevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    display: 'block',
  },
  textInput: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 500,
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  },
  textArea: {
    minHeight: 24,
    resize: 'none',
    overflow: 'hidden',
  },
  datePickerButton: {
    padding: '12px 14px',
    backgroundColor: colors.elevated,
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  datePickerText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 500,
  },
  milestoneItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  milestoneCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    border: '2px solid #444444',
    marginTop: 3,
    flexShrink: 0,
  },
  milestoneContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  milestoneText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 4,
  },
  milestoneDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  milestoneRemove: {
    padding: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  milestoneRemoveText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  addMilestoneButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  addMilestoneCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    border: '2px solid #6B6B6B',
  },
  commitmentBox: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    marginBottom: 16,
    background: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  commitmentCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    border: '2px solid #6B6B6B',
    marginTop: 1,
    flexShrink: 0,
  },
  commitmentContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  commitmentTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: '21px',
  },
  commitmentText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: '20px',
    marginTop: 8,
    whiteSpace: 'pre-line',
  },
  saveButton: {
    width: '100%',
    padding: 12,
    backgroundColor: colors.elevated,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    cursor: 'pointer',
  },
  saveButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 600,
  },
  deleteButton: {
    width: '100%',
    padding: 12,
    backgroundColor: colors.elevated,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    cursor: 'pointer',
  },
  deleteButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: 600,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 400,
  },
  datePickerHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  confirmModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  confirmTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 12,
    textAlign: 'center',
    display: 'block',
  },
  confirmSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: '22px',
    textAlign: 'center',
    marginBottom: 24,
    display: 'block',
  },
  confirmCancelBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  confirmDeleteBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
};
