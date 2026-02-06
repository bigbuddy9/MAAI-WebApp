'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useGoals } from '@/contexts/GoalContext';
import { useTasks } from '@/contexts/TaskContext';
import { useStats } from '@/contexts/StatsContext';
import { getGoalColor, getTierByPercentage } from '@/shared';

// Theme values (matching mobile exactly)
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
  track: '#1A1A1A',
  tier1Main: '#00FFFF',
};
const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24 };
const borderRadius = { sm: 6, md: 8, lg: 10, xl: 12, '2xl': 14, '3xl': 16 };

// 6-tier color system for MiniRing
const TIER_COLORS: Record<number, string> = {
  1: '#00FFFF',
  2: '#38BDF8',
  3: '#2563EB',
  4: '#A78BFA',
  5: '#7C3AED',
  6: '#4B5563',
};
function getTierColor(percent: number): string {
  if (percent >= 90) return TIER_COLORS[1];
  if (percent >= 70) return TIER_COLORS[2];
  if (percent >= 50) return TIER_COLORS[3];
  if (percent >= 30) return TIER_COLORS[4];
  if (percent >= 10) return TIER_COLORS[5];
  return TIER_COLORS[6];
}

// ---------- MiniRing (SVG port of mobile Skia MiniRing) ----------
function MiniRing({
  percent,
  size = 44,
  strokeWidth = 5,
  colorOverride,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  colorOverride?: string;
}) {
  const [displayPercent, setDisplayPercent] = useState(0);
  const tierColor = colorOverride || getTierColor(percent);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (displayPercent / 100) * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => setDisplayPercent(percent), 50);
    return () => clearTimeout(timeout);
  }, [percent]);

  const filterId = `mini-ring-glow-${size}-${strokeWidth}-${tierColor.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.track}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc with glow */}
        {percent > 0 && (
          <>
            {/* Glow layer */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={tierColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              filter={`url(#${filterId})`}
              style={{
                transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease',
              }}
            />
            {/* Solid layer */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={tierColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease',
              }}
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ---------- Types matching mobile GoalCard ----------
interface EnrichedGoal {
  id: number;
  name: string;
  priority: number;
  timeElapsed: number;
  taskRate: number;
  probability: number;
  tasks: number;
  trend: 'improving' | 'stable' | 'declining';
  daysLeft?: number;
}

interface CompletedGoalDisplay {
  id: number;
  name: string;
  completedDate: string;
}

type GoalFilter = 'active' | 'completed';

// ---------- GoalCard (port of mobile GoalCard) ----------
function GoalCard({ goal, onPress }: { goal: EnrichedGoal; onPress: () => void }) {
  const goalColor = getGoalColor(goal.priority);
  const mainColor = typeof goalColor === 'object' && 'main' in goalColor ? goalColor.main : '#4B5563';
  const timeColor = getTierByPercentage(goal.timeElapsed);
  const timeColorMain = typeof timeColor === 'object' && 'main' in timeColor ? timeColor.main : '#4B5563';

  const getTrendInfo = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return { icon: '\u2191', text: 'Improving' };
      case 'declining': return { icon: '\u2193', text: 'Declining' };
      default: return { icon: '\u2192', text: 'Stable' };
    }
  };
  const trendInfo = getTrendInfo(goal.trend);

  return (
    <button
      onClick={onPress}
      style={{
        display: 'block',
        width: '100%',
        backgroundColor: colors.card,
        borderRadius: borderRadius.xl, // 12
        padding: spacing.lg, // 16
        marginBottom: spacing.md, // 12
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Top row: color dot + goal name */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 18,
      }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          marginTop: 6,
          flexShrink: 0,
          backgroundColor: mainColor,
        }} />
        <div style={{
          color: colors.textPrimary,
          fontSize: 20,
          fontWeight: 600,
          lineHeight: '27px',
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {goal.name}
        </div>
      </div>

      {/* Three mini rings */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 20,
        marginBottom: 18,
        paddingLeft: 26, // 12px dot + 14px gap
      }}>
        <MiniRing percent={goal.timeElapsed} colorOverride={timeColorMain} />
        <MiniRing percent={goal.taskRate} />
        <MiniRing percent={goal.probability} />
      </div>

      {/* Bottom row: tasks count + days left + trend */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        paddingLeft: 26,
      }}>
        <span style={{ color: colors.textMuted, fontSize: 12 }}>
          {goal.tasks} tasks
        </span>
        {goal.daysLeft !== undefined && (
          <span style={{ color: colors.textMuted, fontSize: 12 }}>
            {goal.daysLeft} {goal.daysLeft === 1 ? 'day' : 'days'} left
          </span>
        )}
        <span style={{ color: colors.textMuted, fontSize: 12 }}>
          {trendInfo.icon} {trendInfo.text}
        </span>
      </div>
    </button>
  );
}

// ---------- CompletedGoalCard (port of mobile CompletedGoalCard) ----------
function CompletedGoalCard({ goal, onPress }: { goal: CompletedGoalDisplay; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      style={{
        display: 'block',
        width: '100%',
        backgroundColor: colors.card,
        borderRadius: borderRadius.xl, // 12
        padding: spacing.lg, // 16
        marginBottom: spacing.md, // 12
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Top row: glowing dot + goal name */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 10,
      }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          flexShrink: 0,
          marginTop: 7,
          backgroundColor: colors.tier1Main,
          boxShadow: `0 0 8px ${colors.tier1Main}, 0 0 16px rgba(0, 255, 255, 0.4)`,
        }} />
        <div style={{
          color: colors.textPrimary,
          fontSize: 20,
          fontWeight: 600,
          lineHeight: '27px',
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {goal.name}
        </div>
      </div>

      {/* Bottom row: completed date */}
      <div style={{ paddingLeft: 26 }}>
        <span style={{ color: colors.textMuted, fontSize: 12 }}>
          Completed {goal.completedDate}
        </span>
      </div>
    </button>
  );
}

// ---------- Main GoalListView ----------
interface GoalListViewProps {
  onNavigateToGoal?: (goalId: number) => void;
  onAddGoal?: () => void;
}

export default function GoalListView({ onNavigateToGoal, onAddGoal }: GoalListViewProps) {
  const [filter, setFilter] = useState<GoalFilter>('active');
  const [isEditMode, setIsEditMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSettling, setIsSettling] = useState(false);
  const [noTransition, setNoTransition] = useState(false);
  const dragStartY = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const GOAL_CARD_HEIGHT = 176; // ~165px card + 12px margin (matching mobile)

  const { getActiveGoals, getCompletedGoals, isLoading, moveGoalToPosition } = useGoals();
  const { tasks } = useTasks();
  const { completions } = useStats();

  // Calculate days left from target date
  const calculateDaysLeft = (targetDate: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Enrich active goals with task count and days left (matching mobile logic)
  const activeGoals: EnrichedGoal[] = useMemo(() => {
    return getActiveGoals().map(g => {
      const goalTasks = tasks.filter(t => t.goalId === g.id);
      const taskCount = goalTasks.length;

      return {
        id: g.id,
        name: g.name,
        priority: g.priority,
        timeElapsed: g.timeElapsed,
        taskRate: g.taskRate,
        probability: g.probability,
        tasks: taskCount,
        trend: g.trend,
        daysLeft: calculateDaysLeft(g.targetDate),
      };
    });
  }, [getActiveGoals, tasks, completions]);

  const completedGoals: CompletedGoalDisplay[] = useMemo(() => {
    return getCompletedGoals();
  }, [getCompletedGoals]);

  // ── Drag-to-reorder handlers (matching mobile DraggableGoalCard) ────────
  const handleDragStart = useCallback((index: number, clientY: number) => {
    setDragIndex(index);
    setDragOffset(0);
    dragStartY.current = clientY;
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (dragIndex === null) return;
    setDragOffset(clientY - dragStartY.current);
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragIndex === null) return;
    const movedBy = Math.round(dragOffset / GOAL_CARD_HEIGHT);
    const toIndex = Math.max(0, Math.min(activeGoals.length - 1, dragIndex + movedBy));
    // Snap to the target slot position with a transition
    const snapOffset = movedBy * GOAL_CARD_HEIGHT;
    setDragOffset(snapOffset);
    setIsSettling(true);
    // After the transition completes, do the actual reorder and reset
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      // Disable transitions so the DOM reorder + transform reset is invisible
      setNoTransition(true);
      if (dragIndex !== toIndex) {
        const goalId = activeGoals[dragIndex].id;
        moveGoalToPosition(goalId, toIndex);
      }
      setDragIndex(null);
      setDragOffset(0);
      setIsSettling(false);
      // Re-enable transitions on the next frame
      requestAnimationFrame(() => {
        setNoTransition(false);
      });
    }, 200);
  }, [dragIndex, dragOffset, activeGoals, moveGoalToPosition, GOAL_CARD_HEIGHT]);

  // Global mouse/touch handlers for drag
  useEffect(() => {
    if (dragIndex === null || isSettling) return;
    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleDragMove(e.clientY);
    };
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => handleDragEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragIndex, isSettling, handleDragMove, handleDragEnd]);

  // Compute shift for non-dragged cards
  const getCardShift = useCallback((index: number) => {
    if (dragIndex === null) return 0;
    if (dragIndex === index) return 0;
    const draggedToPosition = dragIndex + Math.round(dragOffset / GOAL_CARD_HEIGHT);
    if (dragIndex < index && draggedToPosition >= index) return -GOAL_CARD_HEIGHT;
    if (dragIndex > index && draggedToPosition <= index) return GOAL_CARD_HEIGHT;
    return 0;
  }, [dragIndex, dragOffset, GOAL_CARD_HEIGHT]);

  // Reset edit mode when switching filters
  useEffect(() => {
    setIsEditMode(false);
    setDragIndex(null);
    setDragOffset(0);
  }, [filter]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: 60,
        color: colors.textMuted,
      }}>
        Loading goals...
      </div>
    );
  }

  // Calculate filter toggle height for absolute positioning
  const FILTER_HEIGHT = 76; // 16px paddingTop + 44px toggle + 16px marginBottom

  return (
    <div style={{
      position: 'relative',
      flex: 1,
      height: '100%',
      backgroundColor: colors.background,
    }}>
      {/* Active/Completed Toggle - fixed at top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingLeft: spacing.lg,
        paddingRight: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
        backgroundColor: colors.background,
        zIndex: 1,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: colors.elevated,
          borderRadius: borderRadius.lg, // 10
          padding: 4,
        }}>
          {(['active', 'completed'] as GoalFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1,
                paddingTop: spacing.md, // 12
                paddingBottom: spacing.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: borderRadius.md, // 8
                backgroundColor: filter === f ? colors.border : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: filter === f ? 600 : 500,
                color: filter === f ? colors.textPrimary : colors.textMuted,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content - absolute positioned to fill remaining space */}
      <div style={{
        position: 'absolute',
        top: FILTER_HEIGHT,
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: 'auto',
        padding: spacing.lg,
        paddingBottom: 32,
      }}>
        {/* Active Goals */}
        {filter === 'active' && (
          <>
            <div style={{ position: 'relative' }}>
              {activeGoals.map((goal, index) => {
                const isDragging = dragIndex === index;
                const shift = getCardShift(index);
                return (
                  <div
                    key={goal.id}
                    style={{
                      position: 'relative',
                      zIndex: isDragging ? 100 : 0,
                      transform: isDragging
                        ? `translateY(${dragOffset}px) scale(${isSettling ? 1 : 1.02})`
                        : `translateY(${shift}px)`,
                      transition: noTransition ? 'none' : (isDragging && !isSettling) ? 'none' : 'transform 200ms cubic-bezier(0.33, 1, 0.68, 1)',
                      cursor: isEditMode ? 'grab' : 'pointer',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}
                    onMouseDown={(e) => {
                      if (!isEditMode) return;
                      e.preventDefault();
                      handleDragStart(index, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (!isEditMode) return;
                      handleDragStart(index, e.touches[0].clientY);
                    }}
                  >
                    <div style={{
                      animation: isEditMode && !isDragging ? 'goalShake 240ms ease-in-out infinite alternate' : 'none',
                    }}>
                      <GoalCard
                        goal={goal}
                        onPress={() => { if (!isEditMode) onNavigateToGoal?.(goal.id); }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Goal button - matching mobile actionButton */}
            {!isEditMode && (
              <button
                onClick={() => onAddGoal?.()}
                style={{
                  width: '100%',
                  padding: 12,
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.xl, // 12
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: spacing.sm, // 8
                  cursor: 'pointer',
                  color: colors.textPrimary,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Add Goal
              </button>
            )}

            {/* Edit Order button - only show when >1 active goal */}
            {activeGoals.length > 1 && (
              <button
                onClick={() => {
                  if (isEditMode && dragIndex !== null) handleDragEnd();
                  setIsEditMode(prev => !prev);
                }}
                style={{
                  width: '100%',
                  padding: 12,
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.xl, // 12
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: spacing.sm, // 8
                  cursor: 'pointer',
                  color: colors.textPrimary,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {isEditMode ? 'Done' : 'Edit Order'}
              </button>
            )}
          </>
        )}

        {/* Completed Goals */}
        {filter === 'completed' && (
          <>
            {completedGoals.length > 0 ? (
              completedGoals.map((goal) => (
                <CompletedGoalCard
                  key={goal.id}
                  goal={goal}
                  onPress={() => onNavigateToGoal?.(goal.id)}
                />
              ))
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 40,
                paddingBottom: 40,
              }}>
                <span style={{ color: colors.textMuted, fontSize: 15 }}>
                  No completed goals yet
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
