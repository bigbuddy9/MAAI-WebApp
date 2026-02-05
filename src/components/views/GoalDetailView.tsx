'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGoals } from '@/contexts/GoalContext';
import { useTasks } from '@/contexts/TaskContext';
import { useStats } from '@/contexts/StatsContext';
import { getGoalColor } from '@maai/shared';
import * as calculations from '@maai/shared';

interface GoalDetailViewProps {
  goalId: number;
  onBack?: () => void;
  onNavigateToTask?: (taskId: number) => void;
  onEditGoal?: (goalId: number) => void;
}

interface TaskPerformance {
  id: number;
  name: string;
  frequency: string;
  rate: number;
}

// Color for percentage - matches mobile's getColorForPercent
const getColorForPercent = (percent: number): string => {
  if (percent >= 90) return '#00FFFF';
  if (percent >= 70) return '#38BDF8';
  if (percent >= 50) return '#2563EB';
  if (percent >= 30) return '#A78BFA';
  if (percent >= 10) return '#7C3AED';
  return '#4B5563';
};

// Format date for display
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Calculate days left
const calculateDaysLeft = (targetDate: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/* ─── SVG Stat Ring ─── */
let statRingCounter = 0;

function StatRing({
  percent,
  color,
  label,
  size = 80,
  strokeWidth = 6,
  animated,
}: {
  percent: number;
  color: string;
  label: string;
  size?: number;
  strokeWidth?: number;
  animated: boolean;
}) {
  const [filterId] = useState(() => `statRingGlow_${++statRingCounter}`);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const displayPercent = animated ? percent : 0;
  const dashOffset = circumference - (displayPercent / 100) * circumference;
  const padding = 12;
  const canvasSize = size + padding;
  const center = canvasSize / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: canvasSize, height: canvasSize, position: 'relative' }}>
        <svg width={canvasSize} height={canvasSize} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1A1A1A"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc with glow */}
          {displayPercent > 0 && (
            <>
              {/* Glow layer */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                filter={`url(#${filterId})`}
                style={{
                  transition: animated ? 'stroke-dashoffset 0.8s ease-out' : 'none',
                }}
              />
              {/* Solid layer on top */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{
                  transition: animated ? 'stroke-dashoffset 0.8s ease-out' : 'none',
                }}
              />
            </>
          )}
        </svg>
        {/* Center value */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasSize,
            height: canvasSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 600 }}>
            {animated ? percent : 0}%
          </span>
        </div>
      </div>
      <span style={{ color: '#6B6B6B', fontSize: 11, fontWeight: 500, marginTop: 10 }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Progress Bar with glow ─── */
function ProgressBar({ rate, color, animated }: { rate: number; color: string; animated: boolean }) {
  const width = animated ? rate : 0;
  return (
    <div style={{
      height: 8,
      backgroundColor: '#1A1A1A',
      borderRadius: 4,
      position: 'relative',
    }}>
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          backgroundColor: color,
          borderRadius: 4,
          transition: animated ? 'width 0.8s ease-out' : 'none',
          boxShadow: `0 0 8px ${color}66`,
        }}
      />
    </div>
  );
}

/* ─── Grid Icon (3x3 dots) ─── */
function GridIcon() {
  return (
    <div style={{ width: 18, height: 18, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[0, 1, 2].map(row => (
        <div key={row} style={{ display: 'flex', gap: 2, flex: 1 }}>
          {[0, 1, 2].map(col => (
            <div
              key={col}
              style={{
                flex: 1,
                backgroundColor: '#404040',
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function GoalDetailView({ goalId, onBack, onNavigateToTask, onEditGoal }: GoalDetailViewProps) {
  const { goals, completeGoal, updateGoal } = useGoals();
  const { tasks } = useTasks();
  const { completions } = useStats();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showReflection, setShowReflection] = useState(false);

  const [reflectionText, setReflectionText] = useState('');
  const [animated, setAnimated] = useState(false);

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
      // Animate off-screen first, then call onBack
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

  // Animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const goalData = goals.find(g => g.id === goalId);

  // Milestones state
  const [milestones, setMilestones] = useState<
    Array<{
      description: string;
      completed: boolean;
      targetDateStr: string;
      completedDateStr: string | null;
    }>
  >([]);

  useEffect(() => {
    if (goalData) {
      setMilestones(
        goalData.milestones.map(m => ({
          description: m.description,
          completed: m.completed,
          targetDateStr: formatDate(m.targetDate),
          completedDateStr: m.completed ? formatDate(new Date()) : null,
        }))
      );
    }
  }, [goalData?.id]);

  // Compute real task rate from completions
  const realTaskRate = useMemo(() => {
    if (!goalData) return 0;
    const goalTasks = tasks.filter(t => t.goalId === goalData.id);
    if (goalTasks.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(goalData.createdAt);
    startDate.setHours(0, 0, 0, 0);
    let scheduled = 0;
    let completed = 0;
    const d = new Date(startDate);

    while (d <= today) {
      const dateStr = calculations.formatDate(d);
      for (const task of goalTasks) {
        if (calculations.isTaskScheduledForDate(task as calculations.Task, d)) {
          scheduled++;
          const c = completions.find(comp => comp.taskId === task.id && comp.date === dateStr);
          if (c && calculations.isTaskCompleted(task as calculations.Task, c)) completed++;
        }
      }
      d.setDate(d.getDate() + 1);
    }

    return scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
  }, [tasks, completions, goalData?.id, goalData?.createdAt]);

  // Calculate probability based on pace
  const probability = useMemo(() => {
    if (!goalData) return 50;
    const paceRatio = realTaskRate / Math.max(goalData.timeElapsed, 1);

    let base;
    if (paceRatio >= 1.50) base = 95;
    else if (paceRatio >= 1.30) base = 90;
    else if (paceRatio >= 1.15) base = 82;
    else if (paceRatio >= 1.00) base = 70;
    else if (paceRatio >= 0.90) base = 55;
    else if (paceRatio >= 0.75) base = 40;
    else if (paceRatio >= 0.60) base = 25;
    else if (paceRatio >= 0.40) base = 15;
    else base = 8;

    return Math.min(99, Math.max(5, base));
  }, [realTaskRate, goalData?.timeElapsed]);

  // Compute real trend: compare last 7 days vs prior 7 days
  const realTrend = useMemo((): 'improving' | 'stable' | 'declining' => {
    if (!goalData) return 'stable';
    const goalTasks = tasks.filter(t => t.goalId === goalData.id);
    if (goalTasks.length === 0) return 'stable';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentStart = new Date(today);
    recentStart.setDate(recentStart.getDate() - 6);
    const priorStart = new Date(today);
    priorStart.setDate(priorStart.getDate() - 13);

    let recentSched = 0, recentDone = 0, priorSched = 0, priorDone = 0;
    const d = new Date(priorStart);
    while (d <= today) {
      const dateStr = calculations.formatDate(d);
      const isRecent = d >= recentStart;
      for (const task of goalTasks) {
        if (calculations.isTaskScheduledForDate(task as calculations.Task, d)) {
          if (isRecent) {
            recentSched++;
            const c = completions.find(comp => comp.taskId === task.id && comp.date === dateStr);
            if (c && calculations.isTaskCompleted(task as calculations.Task, c)) recentDone++;
          } else {
            priorSched++;
            const c = completions.find(comp => comp.taskId === task.id && comp.date === dateStr);
            if (c && calculations.isTaskCompleted(task as calculations.Task, c)) priorDone++;
          }
        }
      }
      d.setDate(d.getDate() + 1);
    }

    const recentRate = recentSched > 0 ? recentDone / recentSched : 0;
    const priorRate = priorSched > 0 ? priorDone / priorSched : 0;
    if (recentRate > priorRate + 0.05) return 'improving';
    if (recentRate < priorRate - 0.05) return 'declining';
    return 'stable';
  }, [tasks, completions, goalData?.id]);

  // Get trend info
  const getTrendInfo = () => {
    if (realTrend === 'improving') return { text: 'Improving', color: '#00FFFF', icon: '\u2191' };
    if (realTrend === 'declining') return { text: 'Declining', color: '#7C3AED', icon: '\u2193' };
    return { text: 'Stable', color: '#38BDF8', icon: '\u2192' };
  };

  // Task performance - last 30 days
  const taskPerformance: TaskPerformance[] = useMemo(() => {
    if (!goalData) return [];
    const goalTasks = tasks.filter(t => t.goalId === goalData.id);

    return goalTasks.map(task => {
      const today = new Date();
      let scheduledDays = 0;
      let completedDays = 0;

      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = calculations.formatDate(date);

        const calcTask: calculations.Task = {
          ...task,
          goalPriority: task.goalPriority,
        };

        if (calculations.isTaskScheduledForDate(calcTask, date)) {
          scheduledDays++;
          const completion = completions.find(
            c => c.taskId === task.id && c.date === dateStr
          );
          if (completion?.completed) {
            completedDays++;
          }
        }
      }

      const rate = scheduledDays > 0
        ? Math.round((completedDays / scheduledDays) * 100)
        : 0;

      const freqMap: Record<string, string> = {
        'daily': 'Daily',
        '1x': '1x/week',
        '2x': '2x/week',
        '3x': '3x/week',
        '4x': '4x/week',
        '5x': '5x/week',
        '6x': '6x/week',
      };

      return {
        id: task.id,
        name: task.name,
        frequency: freqMap[task.frequency] || task.frequency,
        rate,
      };
    });
  }, [tasks, goalData?.id, completions]);

  const toggleMilestone = (index: number) => {
    setMilestones(prev => {
      const newMilestones = [...prev];
      const ms = { ...newMilestones[index] };
      ms.completed = !ms.completed;
      ms.completedDateStr = ms.completed ? formatDate(new Date()) : null;
      newMilestones[index] = ms;
      return newMilestones;
    });
  };

  const handleMarkComplete = () => {
    setShowConfirmModal(true);
  };

  const confirmComplete = async () => {
    setShowConfirmModal(false);
    await completeGoal(goalData!.id);
    setShowCelebration(true);
  };

  const handleCelebrationDone = () => {
    setShowCelebration(false);
    setShowReflection(true);
  };

  const handleSaveReflection = () => {
    if (reflectionText.trim()) {
      updateGoal(goalData!.id, { reflection: reflectionText.trim() });
    }
    setShowReflection(false);
    onBack?.();
  };



  // Not found
  if (!goalData) {
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
          <div style={styles.notFoundContainer}>
            <span style={styles.notFoundText}>Goal not found</span>
          </div>
        </div>
      </div>
    );
  }

  const daysLeft = calculateDaysLeft(goalData.targetDate);
  const trendInfo = getTrendInfo();
  const goalColor = getGoalColor(goalData.priority);
  const mainColor = typeof goalColor === 'object' && 'main' in goalColor ? goalColor.main : '#4B5563';

  const timeElapsedColor = getColorForPercent(goalData.timeElapsed);
  const taskRateColor = getColorForPercent(realTaskRate);
  const probabilityColor = getColorForPercent(probability);

  const daysAgoText = (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const created = new Date(goalData.createdAt);
    created.setHours(0, 0, 0, 0);
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`;
  })();

  return (
    <div style={{
      ...styles.container,
      transform: isDismissing ? 'translateY(100vh)' : pullOffset > 0 ? `translateY(${pullOffset}px)` : undefined,
      transition: isDismissing ? 'transform 350ms ease-in' : isPulling ? 'none' : 'transform 200ms ease-out',
    }}>
      <div style={styles.modalSheet}>
        {/* Pull indicator / drag handle — pull down to dismiss */}
        <div
          style={{ ...styles.pullIndicatorContainer, cursor: 'grab' }}
          onClick={() => onBack?.()}
          onMouseDown={(e) => { e.preventDefault(); handlePullStart(e.clientY); }}
          onTouchStart={(e) => handlePullStart(e.touches[0].clientY)}
        >
          <div style={styles.pullIndicator} />
        </div>

        <div style={styles.scrollView}>
          <div style={styles.scrollContent}>
            {/* Goal Section */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Goal</span>
              <span style={styles.goalName}>{goalData.name}</span>

              {/* Trend pill or Completed indicator */}
              {goalData.completed ? (
                <div
                  style={{
                    ...styles.trendPill,
                    backgroundColor: `${mainColor}30`,
                    border: `1px solid ${mainColor}`,
                  }}
                >
                  <div
                    style={{
                      ...styles.trendDot,
                      backgroundColor: mainColor,
                    }}
                  />
                  <span style={{ ...styles.trendText, color: '#FFFFFF' }}>Completed</span>
                </div>
              ) : (
                <div
                  style={{
                    ...styles.trendPill,
                    backgroundColor: `${trendInfo.color}30`,
                    border: `1px solid ${trendInfo.color}`,
                  }}
                >
                  <span style={{ ...styles.trendIcon, color: '#FFFFFF' }}>{trendInfo.icon}</span>
                  <span style={{ ...styles.trendText, color: '#FFFFFF' }}>{trendInfo.text}</span>
                </div>
              )}
            </div>

            {/* Completed Date - only shows when completed */}
            {goalData.completed && goalData.completedDate && (
              <div style={styles.section}>
                <span style={styles.sectionLabel}>Completed</span>
                <span style={styles.sectionValue}>{formatDate(goalData.completedDate)}</span>
              </div>
            )}

            {/* Target Date */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Target</span>
              <div style={styles.targetRow}>
                <span style={styles.sectionValue}>{formatDate(goalData.targetDate)}</span>
                {!goalData.completed && (
                  <span style={styles.daysLeft}>{daysLeft} days left</span>
                )}
              </div>
            </div>

            {/* Goal Set Date */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Goal Set</span>
              <div style={styles.targetRow}>
                <span style={styles.sectionValue}>{formatDate(goalData.createdAt)}</span>
                <span style={styles.daysLeft}>{daysAgoText}</span>
              </div>
            </div>

            {/* Stats Rings */}
            <div style={styles.ringsSection}>
              <div style={styles.ringsRow}>
                <StatRing
                  percent={goalData.timeElapsed}
                  color={timeElapsedColor}
                  label="Time Elapsed"
                  animated={animated}
                />
                <StatRing
                  percent={realTaskRate}
                  color={taskRateColor}
                  label="Task Rate"
                  animated={animated}
                />
                <StatRing
                  percent={probability}
                  color={probabilityColor}
                  label="Probability"
                  animated={animated}
                />
              </div>
            </div>

            {/* Milestones */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Milestones</span>
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  style={styles.milestoneItem}
                  onClick={() => toggleMilestone(index)}
                >
                  <div
                    style={{
                      ...styles.milestoneCircle,
                      ...(milestone.completed
                        ? {
                            backgroundColor: '#00FFFF',
                            borderColor: '#00FFFF',
                            boxShadow: '0 0 8px rgba(0, 255, 255, 0.8)',
                          }
                        : {}),
                    }}
                  />
                  <div style={styles.milestoneContent}>
                    <span
                      style={{
                        ...styles.milestoneText,
                        ...(milestone.completed ? { color: '#6B6B6B' } : {}),
                      }}
                    >
                      {milestone.description}
                    </span>
                    <span style={styles.milestoneDate}>
                      {milestone.completed ? milestone.completedDateStr : milestone.targetDateStr}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Task Performance */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Task Performance</span>
              {taskPerformance.map(task => {
                const taskColor = getColorForPercent(task.rate);
                return (
                  <div key={task.id} style={styles.taskItem}>
                    <div style={styles.taskHeader}>
                      <div style={styles.taskInfo}>
                        <span style={styles.taskName}>{task.name}</span>
                        <span style={styles.taskFrequency}>({task.frequency})</span>
                      </div>
                      <span style={styles.taskPercent}>{animated ? task.rate : 0}%</span>
                    </div>
                    <div style={styles.progressRow}>
                      <div style={styles.progressBarContainer}>
                        <ProgressBar rate={task.rate} color={taskColor} animated={animated} />
                      </div>
                      <button
                        style={styles.gridIconButton}
                        onClick={() => onNavigateToTask?.(task.id)}
                      >
                        <GridIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Why This Matters */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Why This Matters</span>
              <span style={styles.whyText}>{goalData.why}</span>
            </div>

            {/* Your Reward */}
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Your Reward</span>
              <span style={styles.whyText}>{goalData.reward}</span>
            </div>

            {/* Message to Future Self */}
            {goalData.futureMessage && (
              <div style={styles.section}>
                <div style={styles.messageLabelRow}>
                  <span style={styles.sectionLabel}>Note to Future Self</span>
                  <span style={styles.messageDate}>{formatDate(goalData.createdAt)}</span>
                </div>
                <span style={styles.reflectionTextStyle}>&ldquo;{goalData.futureMessage}&rdquo;</span>
              </div>
            )}

            {/* Message to Past Self - only shows for completed goals with a reflection */}
            {goalData.completed && goalData.reflection && (
              <div style={styles.section}>
                <div style={styles.messageLabelRow}>
                  <span style={styles.sectionLabel}>Note to Past Self</span>
                  {goalData.completedDate && (
                    <span style={styles.messageDate}>{formatDate(goalData.completedDate)}</span>
                  )}
                </div>
                <span style={styles.reflectionTextStyle}>&ldquo;{goalData.reflection}&rdquo;</span>
              </div>
            )}

            {/* Bottom Actions - only show for active goals */}
            {!goalData.completed && (
              <div style={styles.actionsContainer}>
                <button style={styles.editButton} onClick={() => onEditGoal?.(goalData.id)}>
                  <span style={styles.editButtonText}>Edit Goal</span>
                </button>

                <button style={styles.completeButton} onClick={handleMarkComplete}>
                  <span style={styles.completeButtonText}>Mark Complete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={styles.confirmOverlay} onClick={() => setShowConfirmModal(false)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <span style={styles.confirmTitle}>Complete Goal?</span>
            <span style={styles.confirmSubtitle}>
              Are you sure you want to mark this goal as complete? This will move it to your completed goals.
            </span>

            <button style={styles.confirmYes} onClick={confirmComplete}>
              <span style={styles.confirmYesText}>Yes, Complete</span>
            </button>

            <button style={styles.confirmCancel} onClick={() => setShowConfirmModal(false)}>
              <span style={styles.confirmCancelText}>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && (
        <div style={styles.celebrationOverlay} onClick={handleCelebrationDone}>
          {/* Centered content group */}
          <div style={styles.celebrationContent}>
            {/* Tick with visible glow */}
            <div
              style={{
                ...styles.celebrationTick,
                backgroundColor: mainColor,
                boxShadow: `0 0 24px ${mainColor}88`,
              }}
            >
              <svg width={56} height={56} viewBox="0 0 56 56" fill="none">
                <path
                  d="M16 30L24 38L40 20"
                  stroke="#000000"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Text below tick */}
            <span style={styles.celebrationTitle}>Goal Complete</span>
            <span style={styles.celebrationSubtitle}>
              Congratulations, you earned this.{'\n'}Enjoy the win. On to the next.
            </span>
          </div>

          {/* Hint at very bottom */}
          <div style={styles.celebrationHintContainer}>
            <span style={styles.celebrationHint}>Tap anywhere to continue</span>
          </div>
        </div>
      )}

      {/* Reflection Modal */}
      {showReflection && (
        <div style={styles.reflectionOverlay}>
          <div style={styles.reflectionModal}>
            <span style={styles.reflectionTitle}>Note to Past Self</span>
            <textarea
              style={styles.reflectionInput}
              placeholder="Message to yourself when you started..."
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              rows={4}
              autoFocus
            />
            <span style={styles.reflectionHint}>
              Visible when you view this completed goal.
            </span>
            <button
              style={{
                ...styles.reflectionSaveButton,
                ...(!reflectionText.trim() ? { opacity: 0.4 } : {}),
              }}
              onClick={handleSaveReflection}
              disabled={!reflectionText.trim()}
            >
              <span
                style={{
                  ...styles.reflectionSaveText,
                  ...(!reflectionText.trim() ? { color: '#6B6B6B' } : {}),
                }}
              >
                Save
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Styles matching mobile exactly ─── */
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
  scrollView: {
    flex: 1,
    overflowY: 'auto' as any,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  notFoundContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  },
  notFoundText: {
    color: '#6B6B6B',
    fontSize: 15,
  },

  // Section card
  section: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    color: '#6B6B6B',
    fontSize: 12,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
    marginBottom: 12,
    display: 'block',
  },
  goalName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 600,
    lineHeight: '25px',
    marginBottom: 12,
    display: 'block',
  },

  // Trend pill
  trendPill: {
    display: 'inline-flex',
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 16,
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trendIcon: {
    fontSize: 14,
    fontWeight: 600,
  },
  trendText: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.3,
  },

  sectionValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 500,
  },
  targetRow: {
    display: 'flex',
    flexDirection: 'row' as any,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daysLeft: {
    color: '#6B6B6B',
    fontSize: 14,
  },

  // Rings section
  ringsSection: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 16,
    paddingRight: 16,
    marginBottom: 12,
  },
  ringsRow: {
    display: 'flex',
    flexDirection: 'row' as any,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },

  // Milestones
  milestoneItem: {
    display: 'flex',
    flexDirection: 'row' as any,
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    cursor: 'pointer',
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
    flexDirection: 'column' as any,
  },
  milestoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 4,
  },
  milestoneDate: {
    color: '#4A4A4A',
    fontSize: 12,
  },

  // Task performance
  taskItem: {
    marginBottom: 16,
  },
  taskHeader: {
    display: 'flex',
    flexDirection: 'row' as any,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskInfo: {
    display: 'flex',
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 8,
  },
  taskName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 500,
  },
  taskFrequency: {
    color: '#404040',
    fontSize: 12,
  },
  taskPercent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 600,
  },
  progressRow: {
    display: 'flex',
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 12,
  },
  progressBarContainer: {
    flex: 1,
  },
  gridIconButton: {
    padding: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },

  // Why / Reward text
  whyText: {
    color: '#A1A1A1',
    fontSize: 14,
    lineHeight: '21px',
  },

  // Actions
  actionsContainer: {
    marginTop: 8,
  },
  editButton: {
    backgroundColor: '#111111',
    border: '1px solid #1A1A1A',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
    cursor: 'pointer',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 600,
  },
  completeButton: {
    backgroundColor: '#111111',
    border: '1px solid #1A1A1A',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    cursor: 'pointer',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 600,
  },

  // Confirm overlay / modal
  confirmOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  confirmModal: {
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  confirmTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 600,
    textAlign: 'center' as any,
    marginBottom: 8,
    display: 'block',
  },
  confirmSubtitle: {
    color: '#6B6B6B',
    fontSize: 14,
    textAlign: 'center' as any,
    lineHeight: '21px',
    marginBottom: 24,
    display: 'block',
  },
  confirmYes: {
    backgroundColor: '#111111',
    border: '1px solid #1A1A1A',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
    cursor: 'pointer',
  },
  confirmYesText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 600,
  },
  confirmCancel: {
    backgroundColor: '#111111',
    border: '1px solid #1A1A1A',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    cursor: 'pointer',
  },
  confirmCancelText: {
    color: '#6B6B6B',
    fontSize: 15,
    fontWeight: 600,
  },

  // Celebration overlay
  celebrationOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column' as any,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    cursor: 'pointer',
  },
  celebrationContent: {
    display: 'flex',
    flexDirection: 'column' as any,
    alignItems: 'center',
  },
  celebrationTick: {
    width: 56,
    height: 56,
    borderRadius: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  celebrationTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 700,
    textAlign: 'center' as any,
    marginBottom: 12,
    display: 'block',
  },
  celebrationSubtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center' as any,
    lineHeight: '24px',
    whiteSpace: 'pre-line' as any,
  },
  celebrationHintContainer: {
    position: 'absolute' as any,
    bottom: 30,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationHint: {
    color: '#6B6B6B',
    fontSize: 13,
    textAlign: 'center' as any,
  },

  // Reflection overlay / modal
  reflectionOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },
  reflectionModal: {
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  reflectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 16,
    display: 'block',
  },
  reflectionInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 120,
    marginBottom: 12,
    width: '100%',
    border: 'none',
    resize: 'vertical' as any,
    fontFamily: 'inherit',
    outline: 'none',
  },
  reflectionHint: {
    color: '#404040',
    fontSize: 12,
    textAlign: 'center' as any,
    marginBottom: 20,
    display: 'block',
  },
  reflectionSaveButton: {
    backgroundColor: '#111111',
    border: '1px solid #1A1A1A',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    cursor: 'pointer',
  },
  reflectionSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 600,
  },

  // Reflection text display (italic quote)
  reflectionTextStyle: {
    color: '#A1A1A1',
    fontSize: 14,
    lineHeight: '21px',
    fontStyle: 'italic' as any,
  },

  // Message label row
  messageLabelRow: {
    display: 'flex',
    flexDirection: 'row' as any,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageDate: {
    color: '#404040',
    fontSize: 11,
  },
};
