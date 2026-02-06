'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGoals } from '@/contexts/GoalContext';
import { getGoalColor } from '@/shared';

interface AddGoalViewProps {
  onBack?: () => void;
}

interface Milestone {
  description: string;
  targetDate: Date;
}

// Custom Date Picker Component (matching mobile)
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CustomDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

function CustomDatePicker({ value, onChange, minimumDate }: CustomDatePickerProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

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
    const newDaysInMonth = getDaysInMonth(month, selectedYear);
    const newDay = Math.min(selectedDay, newDaysInMonth);
    setSelectedDay(newDay);
    onChange(new Date(selectedYear, month, newDay));
  };

  const handleDayChange = (day: number) => {
    setSelectedDay(day);
    onChange(new Date(selectedYear, selectedMonth, day));
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const newDaysInMonth = getDaysInMonth(selectedMonth, year);
    const newDay = Math.min(selectedDay, newDaysInMonth);
    setSelectedDay(newDay);
    onChange(new Date(year, selectedMonth, newDay));
  };

  const dpColors = {
    bg: '#111111',
    bgSelected: '#0D0D0D',
    borderSelected: '#2A2A2A',
    textPrimary: '#FFFFFF',
    textMuted: '#6B6B6B',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', padding: 16, gap: 12 }}>
      {/* Month */}
      <div style={{ flex: 1 }}>
        <div style={{ color: dpColors.textMuted, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' as const }}>Month</div>
        <div style={{ height: 180, backgroundColor: dpColors.bg, borderRadius: 8, overflowY: 'auto' as const }}>
          {MONTHS.map((month, index) => {
            const disabled = isDateDisabled(index, selectedDay, selectedYear);
            const selected = selectedMonth === index;
            return (
              <button
                key={month}
                onClick={() => !disabled && handleMonthChange(index)}
                disabled={disabled}
                style={{
                  display: 'block',
                  width: 'calc(100% - 8px)',
                  padding: '10px 8px',
                  textAlign: 'center' as const,
                  borderRadius: 8,
                  margin: '2px 4px',
                  border: selected ? `1px solid ${dpColors.borderSelected}` : '1px solid transparent',
                  backgroundColor: selected ? dpColors.bgSelected : 'transparent',
                  color: disabled ? dpColors.textMuted : dpColors.textPrimary,
                  fontSize: 15,
                  fontWeight: selected ? 600 : 400,
                  opacity: disabled ? 0.3 : 1,
                  cursor: disabled ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {month}
              </button>
            );
          })}
        </div>
      </div>
      {/* Day */}
      <div style={{ flex: 1 }}>
        <div style={{ color: dpColors.textMuted, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' as const }}>Day</div>
        <div style={{ height: 180, backgroundColor: dpColors.bg, borderRadius: 8, overflowY: 'auto' as const }}>
          {days.map((day) => {
            const disabled = isDateDisabled(selectedMonth, day, selectedYear);
            const selected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => !disabled && handleDayChange(day)}
                disabled={disabled}
                style={{
                  display: 'block',
                  width: 'calc(100% - 8px)',
                  padding: '10px 8px',
                  textAlign: 'center' as const,
                  borderRadius: 8,
                  margin: '2px 4px',
                  border: selected ? `1px solid ${dpColors.borderSelected}` : '1px solid transparent',
                  backgroundColor: selected ? dpColors.bgSelected : 'transparent',
                  color: disabled ? dpColors.textMuted : dpColors.textPrimary,
                  fontSize: 15,
                  fontWeight: selected ? 600 : 400,
                  opacity: disabled ? 0.3 : 1,
                  cursor: disabled ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
      {/* Year */}
      <div style={{ flex: 1 }}>
        <div style={{ color: dpColors.textMuted, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' as const }}>Year</div>
        <div style={{ height: 180, backgroundColor: dpColors.bg, borderRadius: 8, overflowY: 'auto' as const }}>
          {years.map((year) => {
            const disabled = isDateDisabled(selectedMonth, selectedDay, year);
            const selected = selectedYear === year;
            return (
              <button
                key={year}
                onClick={() => !disabled && handleYearChange(year)}
                disabled={disabled}
                style={{
                  display: 'block',
                  width: 'calc(100% - 8px)',
                  padding: '10px 8px',
                  textAlign: 'center' as const,
                  borderRadius: 8,
                  margin: '2px 4px',
                  border: selected ? `1px solid ${dpColors.borderSelected}` : '1px solid transparent',
                  backgroundColor: selected ? dpColors.bgSelected : 'transparent',
                  color: disabled ? dpColors.textMuted : dpColors.textPrimary,
                  fontSize: 15,
                  fontWeight: selected ? 600 : 400,
                  opacity: disabled ? 0.3 : 1,
                  cursor: disabled ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Theme constants (matching mobile)
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
  tier1Main: '#00FFFF',
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24 };
const borderRadius = { sm: 6, md: 8, lg: 10, xl: 12, '2xl': 14, '3xl': 16 };

const PRIORITY_OPTIONS = [
  { value: 1, label: '#1', color: '#00FFFF' },
  { value: 2, label: '#2', color: '#38BDF8' },
  { value: 3, label: '#3', color: '#2563EB' },
  { value: 4, label: '#4', color: '#A78BFA' },
  { value: 5, label: '#5', color: '#7C3AED' },
];

export default function AddGoalView({ onBack }: AddGoalViewProps) {
  const { addGoal } = useGoals();

  const [goal, setGoal] = useState('');
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

  // Error state
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  // Date picker modal state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'target' | 'milestone'>('target');
  const [tempDate, setTempDate] = useState(new Date());

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

  const filledFields = [
    goal.trim(),
    completionCriteria.trim(),
    targetDate !== null,
    milestones.length > 0,
    why.trim(),
    reward.trim(),
    futureMessage.trim(),
    committed,
  ].filter(Boolean).length;

  const isValid = filledFields === 8;

  const addMilestoneHandler = () => {
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

    setMilestones([
      ...milestones,
      { description: newMilestone, targetDate: newMilestoneDate },
    ]);
    setNewMilestone('');
    setNewMilestoneDate(null);
    setShowAddMilestone(false);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    onBack?.();
  };

  const handleCreate = () => {
    if (isValid && targetDate) {
      const formattedMilestones = milestones.map((m, index) => ({
        id: index + 1,
        description: m.description,
        targetDate: m.targetDate,
        completed: false,
      }));

      addGoal({
        name: goal.trim(),
        completionCriteria: completionCriteria.trim(),
        targetDate: targetDate,
        milestones: formattedMilestones,
        why: why.trim(),
        reward: reward.trim(),
        committed: committed,
        futureMessage: futureMessage.trim() || undefined,
      });

      onBack?.();
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="addgoal-view" style={{
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
        <button onClick={handleCancel} style={styles.cancelButton}>
          Cancel
        </button>
        <span style={styles.headerTitle}>Add Goal</span>
        <div style={{ width: 50 }} />
      </div>

      {/* Progress dots */}
      <div style={styles.progressDots}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            style={{
              ...styles.dot,
              ...(i < filledFields ? styles.dotFilled : {}),
            }}
          />
        ))}
      </div>

      <div style={styles.scrollView}>
        <div style={styles.scrollContent}>
          {/* Goal Name */}
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Goal</label>
            <input
              type="text"
              style={styles.textInput}
              placeholder="What do you want to achieve?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>

          {/* Completion Criteria */}
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Completion Criteria</label>
            <textarea
              style={{ ...styles.textInput, ...styles.textArea }}
              placeholder="How will you know when this goal is complete?"
              value={completionCriteria}
              onChange={(e) => setCompletionCriteria(e.target.value)}
              rows={2}
            />
          </div>

          {/* Target Date */}
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Target Date</label>
            <button
              style={styles.datePickerButton}
              onClick={() => openDatePicker('target')}
            >
              <span style={targetDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                {targetDate ? formatDate(targetDate) : 'Select target date'}
              </span>
            </button>
          </div>

          {/* Milestones */}
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Milestones</label>

            {milestones.map((milestone, index) => (
              <div key={index} style={styles.milestoneItem}>
                <div style={styles.milestoneCircle} />
                <div style={styles.milestoneContent}>
                  <span style={styles.milestoneText}>
                    {milestone.description}
                  </span>
                  <span style={styles.milestoneDate}>
                    {formatDate(milestone.targetDate)}
                  </span>
                </div>
                <button
                  onClick={() => removeMilestone(index)}
                  style={styles.milestoneRemove}
                >
                  <span style={styles.milestoneRemoveText}>&times;</span>
                </button>
              </div>
            ))}

            {showAddMilestone ? (
              <div style={styles.addMilestoneForm}>
                <input
                  type="text"
                  style={styles.textInput}
                  placeholder="Milestone description"
                  value={newMilestone}
                  onChange={(e) => {
                    setNewMilestone(e.target.value);
                    setMilestoneError(null);
                  }}
                />
                <button
                  style={{ ...styles.datePickerButton, marginTop: 12 }}
                  onClick={() => openDatePicker('milestone')}
                >
                  <span style={newMilestoneDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                    {newMilestoneDate ? formatDate(newMilestoneDate) : 'Select milestone date'}
                  </span>
                </button>
                {milestoneError && (
                  <span style={styles.errorText}>{milestoneError}</span>
                )}
                <div style={styles.addMilestoneButtons}>
                  <button
                    style={styles.addMilestoneCancel}
                    onClick={() => {
                      setShowAddMilestone(false);
                      setNewMilestone('');
                      setNewMilestoneDate(null);
                      setMilestoneError(null);
                    }}
                  >
                    <span style={styles.addMilestoneCancelText}>Cancel</span>
                  </button>
                  <button
                    style={styles.addMilestoneConfirm}
                    onClick={addMilestoneHandler}
                  >
                    <span style={styles.addMilestoneConfirmText}>Add</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                style={styles.addMilestoneButton}
                onClick={() => setShowAddMilestone(true)}
              >
                <div style={styles.addMilestoneCircle} />
                <span style={styles.addMilestoneButtonText}>Add milestone</span>
              </button>
            )}
          </div>

          {/* Why This Matters */}
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Why This Matters</label>
            <textarea
              style={{ ...styles.textInput, ...styles.textArea }}
              placeholder="Why is this goal important to you?"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={2}
            />
          </div>

          {/* Reward */}
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Your Reward</label>
            <textarea
              style={{ ...styles.textInput, ...styles.textArea }}
              placeholder="What will you reward yourself with?"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              rows={2}
            />
          </div>

          {/* Note to Future Self */}
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Note to Future Self</label>
            <textarea
              style={{ ...styles.textInput, ...styles.textArea, minHeight: 72 }}
              placeholder="Message to self upon completion..."
              value={futureMessage}
              onChange={(e) => setFutureMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Commitment Checkbox */}
          <button
            style={{
              ...styles.commitmentBox,
              ...(committed ? styles.commitmentBoxActive : {}),
            }}
            onClick={() => setCommitted(!committed)}
          >
            <div
              style={{
                ...styles.commitmentCircle,
                ...(committed ? styles.commitmentCircleActive : {}),
              }}
            />
            <div style={styles.commitmentContent}>
              <span
                style={{
                  ...styles.commitmentTitle,
                  ...(committed ? styles.commitmentTitleActive : {}),
                }}
              >
                I'm fully committed to this goal.
              </span>
              <span style={styles.commitmentText}>
                No excuses. No backing out.{'\n'}
                I am 100% accountable.{'\n'}
                I will do what's required.
              </span>
            </div>
          </button>

          {/* Create Button */}
          <button
            style={{
              ...styles.createButton,
              opacity: isValid ? 1 : 0.5,
              cursor: isValid ? 'pointer' : 'not-allowed',
            }}
            onClick={handleCreate}
            disabled={!isValid}
          >
            <span style={styles.createButtonText}>Create Goal</span>
          </button>
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div style={styles.datePickerModal} onClick={() => setShowDatePicker(false)}>
          <div style={styles.datePickerContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.datePickerHeader}>
              <button onClick={() => setShowDatePicker(false)} style={styles.datePickerCancelBtn}>
                Cancel
              </button>
              <span style={styles.datePickerTitle}>
                {datePickerMode === 'target' ? 'Target Date' : 'Milestone Date'}
              </span>
              <button onClick={confirmDateSelection} style={styles.datePickerDoneBtn}>
                Done
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

      {/* Global style overrides for native inputs */}
      <style>{`
        .addgoal-view input::placeholder,
        .addgoal-view textarea::placeholder {
          color: ${colors.textMuted};
        }
        .addgoal-view input:focus,
        .addgoal-view textarea:focus {
          outline: none;
        }
        .addgoal-view ::-webkit-scrollbar {
          width: 4px;
        }
        .addgoal-view ::-webkit-scrollbar-track {
          background: transparent;
        }
        .addgoal-view ::-webkit-scrollbar-thumb {
          background: ${colors.borderLight};
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Container
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: colors.background,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },

  // Drag Handle
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

  // Header
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    position: 'relative' as const,
    zIndex: 10,
    flexShrink: 0,
  },
  cancelButton: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 600,
  },

  // Progress Dots
  progressDots: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotFilled: {
    backgroundColor: colors.tier1Main,
  },

  // Scroll area
  scrollView: {
    flex: 1,
    overflowY: 'auto',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },

  // Field
  field: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    display: 'block',
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    fontWeight: 400,
  },

  // Text Input
  textInput: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 500,
    padding: 0,
    margin: 0,
    background: 'none',
    border: 'none',
    width: '100%',
    fontFamily: 'inherit',
    resize: 'none' as const,
  },
  textArea: {
    minHeight: 48,
  },

  // Date Picker Button
  datePickerButton: {
    display: 'block',
    width: '100%',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  datePickerText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 500,
  },
  datePickerPlaceholder: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: 500,
  },

  // Date Picker Modal (contained within panel, not full screen)
  datePickerModal: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    flexDirection: 'column' as const,
    zIndex: 300,
  },
  datePickerContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    display: 'flex',
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  datePickerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 600,
  },
  datePickerCancelBtn: {
    color: colors.textMuted,
    fontSize: 16,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
  },
  datePickerDoneBtn: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
  },

  // Milestones
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
    border: `2px solid ${colors.textMuted}`,
    marginTop: 3,
    flexShrink: 0,
  },
  milestoneContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
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

  // Add Milestone Button
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
    border: `2px solid ${colors.textMuted}`,
  },
  addMilestoneButtonText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  // Add Milestone Form
  addMilestoneForm: {
    marginTop: 8,
  },
  addMilestoneButtons: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  addMilestoneCancel: {
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  addMilestoneCancelText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  addMilestoneConfirm: {
    backgroundColor: colors.elevated,
    border: `1px solid ${colors.border}`,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
  addMilestoneConfirmText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 600,
  },

  // Commitment Box
  commitmentBox: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: spacing.md,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    width: '100%',
  },
  commitmentBoxActive: {
    borderColor: 'rgba(0, 255, 255, 0.4)',
  },
  commitmentCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    border: `2px solid ${colors.textMuted}`,
    marginTop: 1,
    flexShrink: 0,
  },
  commitmentCircleActive: {
    borderColor: colors.tier1Main,
    backgroundColor: colors.tier1Main,
  },
  commitmentContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  commitmentTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: '21px',
  },
  commitmentTitleActive: {
    color: colors.textPrimary,
  },
  commitmentText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: '20px',
    marginTop: 8,
    whiteSpace: 'pre-line' as const,
  },

  // Create Button
  createButton: {
    width: '100%',
    padding: 12,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.xl,
    textAlign: 'center' as const,
    marginBottom: spacing.lg,
    cursor: 'pointer',
  },
  createButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 600,
  },

  // Error text
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 8,
    display: 'block',
  },
};
