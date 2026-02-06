'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTasks, Task } from '@/contexts/TaskContext';
import { useStats } from '@/contexts/StatsContext';
import { SwipeableView } from '@/components/ui/SwipeableView';
import * as calculations from '@/shared';
import { getGoalColor } from '@/shared';

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface TrackerViewProps {
  onNavigateToTask?: (taskId: number) => void;
  onAddTask?: (dateStr?: string) => void;
}

// ─── Theme tokens (matching mobile constants/theme.ts) ───────────────────────
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

// ─── 6-tier color system ─────────────────────────────────────────────────────
const TIER_COLORS: Record<number, string> = {
  1: '#00FFFF',
  2: '#38BDF8',
  3: '#2563EB',
  4: '#A78BFA',
  5: '#7C3AED',
  6: '#4B5563',
};

function getTierNumber(percent: number): number {
  if (percent >= 90) return 1;
  if (percent >= 70) return 2;
  if (percent >= 50) return 3;
  if (percent >= 30) return 4;
  if (percent >= 10) return 5;
  return 6;
}

function getTierColor(percent: number): string {
  return TIER_COLORS[getTierNumber(percent)];
}

const STREAK_TARGET = 30;

// ─── Helper: Monday-based week start ─────────────────────────────────────────
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── SVG Progress Ring (matching mobile StatRing) ────────────────────────────
function StatRing({
  percent,
  label,
  size = 88,
  strokeWidth = 8,
  showPercentSymbol = true,
}: {
  percent: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  showPercentSymbol?: boolean;
}) {
  const [displayPercent, setDisplayPercent] = useState(percent);
  const prevRef = useRef(percent);
  const liveRef = useRef(percent);
  const rafRef = useRef<number | null>(null);
  const firstRef = useRef(true);

  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (firstRef.current) {
      firstRef.current = false;
      setDisplayPercent(percent);
      liveRef.current = percent;
    } else if (prevRef.current !== percent) {
      const start = liveRef.current;
      const startTime = Date.now();
      const duration = 600;
      const tick = () => {
        const t = Math.min((Date.now() - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = start + (percent - start) * eased;
        liveRef.current = v;
        setDisplayPercent(v);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else rafRef.current = null;
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    prevRef.current = percent;
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [percent]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (displayPercent / 100) * circumference;
  const tierColor = getTierColor(displayPercent);
  const fontSize = Math.round(size * (16 / 70));

  // Match mobile: canvas has 20px extra padding for glow
  const canvasSize = size + 20;
  const center = canvasSize / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: canvasSize, height: canvasSize }}>
        <svg width={canvasSize} height={canvasSize} style={{ overflow: 'visible' }}>
          <defs>
            <filter id={`statGlow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>
          {/* Track */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="#1A1A1A" strokeWidth={strokeWidth}
          />
          {/* Glow layer */}
          {displayPercent > 0 && (
            <circle
              cx={center} cy={center} r={radius}
              fill="none" stroke={tierColor} strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${center} ${center})`}
              filter={`url(#statGlow-${label})`}
            />
          )}
          {/* Solid layer */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke={tierColor} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke 0.3s ease' }}
          />
        </svg>
        {/* Center text — absolutely positioned overlay (matches mobile percentContainer) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasSize,
          height: canvasSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>
            <span style={{ fontSize, fontWeight: 700, color: '#FFFFFF' }}>
              {Math.round(displayPercent)}
            </span>
            {showPercentSymbol && (
              <span style={{
                fontSize: Math.round(fontSize * 0.45),
                color: '#666666',
                fontWeight: 700,
              }}>
                %
              </span>
            )}
          </span>
        </div>
      </div>
      <span style={{
        fontSize: 10,
        color: '#666666',
        marginTop: 8,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        fontWeight: 500,
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── SVG Streak Ring (matching mobile StreakRing) ────────────────────────────
function StreakRingComponent({
  value,
  maxValue,
  label = 'Streak',
  size = 88,
  strokeWidth = 8,
}: {
  value: number;
  maxValue?: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const [animatedValue, setAnimatedValue] = useState(value);
  const prevRef = useRef(value);
  const liveRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const firstRef = useRef(true);

  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (firstRef.current) {
      firstRef.current = false;
      setAnimatedValue(value);
      liveRef.current = value;
    } else if (prevRef.current !== value) {
      const start = liveRef.current;
      const startTime = Date.now();
      const duration = 600;
      const tick = () => {
        const t = Math.min((Date.now() - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = start + (value - start) * eased;
        liveRef.current = v;
        setAnimatedValue(v);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else rafRef.current = null;
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    prevRef.current = value;
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  const target = maxValue ?? STREAK_TARGET;
  const percentage = target > 0 ? Math.min((animatedValue / target) * 100, 100) : 0;
  const ringColor = getTierColor(percentage);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;
  const fontSize = Math.round(size * (16 / 70));

  // Match mobile: canvas has 20px extra padding for glow
  const canvasSize = size + 20;
  const center = canvasSize / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: canvasSize, height: canvasSize }}>
        <svg width={canvasSize} height={canvasSize} style={{ overflow: 'visible' }}>
          <defs>
            <filter id="streakGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke={colors.elevated} strokeWidth={strokeWidth}
          />
          {/* Glow layer */}
          {percentage > 0 && (
            <circle
              cx={center} cy={center} r={radius}
              fill="none" stroke={ringColor} strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${center} ${center})`}
              filter="url(#streakGlow)"
            />
          )}
          {/* Solid layer */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke={ringColor} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke 0.3s ease' }}
          />
        </svg>
        {/* Center text — absolutely positioned overlay (matches mobile valueContainer) */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasSize,
          height: canvasSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize, fontWeight: 700, color: '#FFFFFF' }}>
            {Math.round(animatedValue)}
          </span>
        </div>
      </div>
      <span style={{
        fontSize: 10,
        color: '#666666',
        marginTop: 8,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        fontWeight: 500,
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── TaskCard (matching mobile TaskCard layout) ──────────────────────────────
function TaskCardInline({
  task,
  onToggle,
  onValueChange,
  onPress,
  disabled,
}: {
  task: Task & { completed: boolean; value?: number };
  onToggle: () => void;
  onValueChange?: (value: number | undefined) => void;
  onPress: () => void;
  disabled?: boolean;
}) {
  const goalColor = getGoalColor(task.goalPriority);
  const mainColor = typeof goalColor === 'object' && 'main' in goalColor ? goalColor.main : '#4B5563';
  // Track optimistic toggle: null means "use prop value", boolean means "override until prop catches up"
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState(task.value?.toString() ?? '');
  const prevCompletedRef = useRef(task.completed);

  // When the prop value changes (from DB sync), clear the optimistic override
  if (prevCompletedRef.current !== task.completed) {
    prevCompletedRef.current = task.completed;
    setOptimisticCompleted(null);
  }

  const localCompleted = optimisticCompleted !== null ? optimisticCompleted : task.completed;

  useEffect(() => { setInputValue(task.value?.toString() ?? ''); }, [task.value]);

  const importanceLabel = task.importance.charAt(0).toUpperCase() + task.importance.slice(1);
  const difficultyLabel = task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1);

  return (
    <div
      onClick={disabled ? undefined : onPress}
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.elevated; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.card; }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 4,
        backgroundColor: localCompleted ? mainColor : colors.border,
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        transition: 'background-color 0.2s ease',
      }} />

      {/* Content */}
      <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <div style={{
          fontSize: 15,
          fontWeight: 500,
          color: localCompleted ? colors.textPrimary : colors.textMuted,
          marginBottom: 4,
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {task.name}
        </div>
        <div style={{ fontSize: 12, color: colors.textFaint }}>
          {importanceLabel} · {difficultyLabel} · {task.goalId === 0 ? 'Foundations' : `Goal ${task.goalPriority}`}
        </div>
      </div>

      {/* Checkbox or numeric input */}
      {task.type === 'checkbox' ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            setOptimisticCompleted(!localCompleted);
            onToggle();
          }}
          style={{
            width: 21, height: 21,
            borderRadius: 21,
            backgroundColor: localCompleted ? mainColor : colors.elevated,
            border: localCompleted ? 'none' : `2px solid ${colors.borderLight}`,
            marginLeft: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        />
      ) : (
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (disabled) return;
            const sanitized = e.target.value.replace(/[^0-9]/g, '');
            setInputValue(sanitized);
            // Immediately update value and completion status
            const num = parseInt(sanitized, 10);
            const newVal = isNaN(num) ? 0 : num;
            onValueChange?.(newVal);
            // Update optimistic completion based on whether value meets target
            const meetsTarget = task.target !== undefined && newVal >= task.target;
            setOptimisticCompleted(meetsTarget);
          }}
          onBlur={() => {
            // No longer needed for value update, but keep for potential focus styling
          }}
          style={{
            width: 56, height: 36,
            backgroundColor: colors.elevated,
            border: `2px solid ${localCompleted ? mainColor : colors.borderLight}`,
            borderRadius: 8,
            color: colors.textPrimary,
            fontSize: 15,
            fontWeight: 500,
            textAlign: 'center' as const,
            marginLeft: 12,
            outline: 'none',
          }}
        />
      )}
    </div>
  );
}

// ─── DayRow (matching mobile DayRow) ─────────────────────────────────────────
interface DayData {
  dayName: string;
  date: string;
  fullDate: Date;
  tasksCompleted: number;
  totalTasks: number;
  score: number | null;
  isFuture: boolean;
}

function DayRow({ day, onPress }: { day: DayData; onPress: () => void }) {
  const tierColor = day.score !== null ? getTierColor(day.score) : null;
  const size = 34;
  const sw = 4;
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = day.score !== null && day.score > 0
    ? circumference - (day.score / 100) * circumference
    : circumference;

  return (
    <div
      onClick={day.isFuture ? undefined : onPress}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
        border: '1px solid #1A1A1A',
        borderRadius: 12,
        padding: '10px 14px',
        position: 'relative',
        overflow: 'hidden',
        opacity: day.isFuture ? 0.6 : 1,
        cursor: day.isFuture ? 'default' : 'pointer',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => { if (!day.isFuture) (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.elevated; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#0D0D0D'; }}
    >
      {/* Left accent with glow */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 3,
        backgroundColor: tierColor && !day.isFuture ? tierColor : '#1A1A1A',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        boxShadow: tierColor && !day.isFuture ? `0 0 6px ${tierColor}B3` : undefined,
      }} />

      {/* Day info */}
      <div style={{ flex: 1, marginLeft: 10 }}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: day.isFuture ? '#333333' : '#FFFFFF',
          marginBottom: 2,
        }}>
          {day.dayName}
        </div>
        <div style={{
          fontSize: 11,
          color: day.isFuture ? '#333333' : '#666666',
        }}>
          {day.date}
        </div>
      </div>

      {/* Score section */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 12,
          color: day.isFuture ? '#333333' : '#666666',
        }}>
          {day.tasksCompleted}/{day.totalTasks}
        </span>

        {/* Mini ring */}
        <div style={{ position: 'relative', width: size + 6, height: size + 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={size + 6} height={size + 6} style={{ overflow: 'visible' }}>
            <defs>
              <filter id={`dayGlow-${day.date}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
              </filter>
            </defs>
            <circle
              cx={(size + 6) / 2} cy={(size + 6) / 2} r={radius}
              fill="none" stroke="#1A1A1A" strokeWidth={sw}
            />
            {day.score !== null && day.score > 0 && tierColor && (
              <>
                <circle
                  cx={(size + 6) / 2} cy={(size + 6) / 2} r={radius}
                  fill="none" stroke={tierColor} strokeWidth={sw}
                  strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${(size + 6) / 2} ${(size + 6) / 2})`}
                  filter={`url(#dayGlow-${day.date})`}
                />
                <circle
                  cx={(size + 6) / 2} cy={(size + 6) / 2} r={radius}
                  fill="none" stroke={tierColor} strokeWidth={sw}
                  strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${(size + 6) / 2} ${(size + 6) / 2})`}
                />
              </>
            )}
          </svg>
          <span style={{
            position: 'absolute',
            fontSize: 11, fontWeight: 600,
            color: day.isFuture ? '#333333' : '#FFFFFF',
          }}>
            {day.score !== null ? day.score : '\u2013'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── CalendarGrid (matching mobile CalendarGrid) ─────────────────────────────
interface DayCell {
  day: number | null;
  score: number | null;
  isFuture: boolean;
  isToday: boolean;
}

function CalendarGrid({ days, onDayPress }: { days: DayCell[]; onDayPress: (day: number) => void }) {
  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getCellStyle = (cell: DayCell): React.CSSProperties => {
    if (cell.day === null) {
      return { backgroundColor: 'transparent', border: 'none' };
    }
    if (cell.isFuture) {
      return { backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A' };
    }
    if (cell.score === null) {
      return { backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A' };
    }
    const tierColor = getTierColor(cell.score);
    return {
      backgroundColor: `${tierColor}15`,
      border: `2px solid ${tierColor}`,
      boxShadow: `0 0 8px ${tierColor}4D`,
    };
  };

  // Split days into rows of 7
  const rows: DayCell[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  return (
    <div style={{
      backgroundColor: '#0D0D0D',
      border: '1px solid #1A1A1A',
      borderRadius: 12,
      padding: 14,
    }}>
      {/* Weekday headers */}
      <div style={{ display: 'flex', flexDirection: 'row', marginBottom: 12 }}>
        {weekdays.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' as const }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#666666' }}>{d}</span>
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} style={{
          display: 'flex', flexDirection: 'row', gap: 6,
          marginBottom: rowIndex < rows.length - 1 ? 6 : 0,
        }}>
          {row.map((cell, cellIndex) => (
            <div
              key={cellIndex}
              onClick={() => cell.day && !cell.isFuture && onDayPress(cell.day)}
              style={{
                flex: 1,
                aspectRatio: '1',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: cell.day && !cell.isFuture ? 'pointer' : 'default',
                ...getCellStyle(cell),
              }}
            >
              {cell.day && (
                <span style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: cell.isFuture ? '#333333' : (cell.score !== null ? '#FFFFFF' : '#666666'),
                }}>
                  {cell.day}
                </span>
              )}
            </div>
          ))}
          {/* Pad row if less than 7 */}
          {row.length < 7 && Array(7 - row.length).fill(null).map((_, i) => (
            <div key={`pad-${i}`} style={{ flex: 1, aspectRatio: '1' }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main TrackerView
// =============================================================================

export default function TrackerView({ onNavigateToTask, onAddTask }: TrackerViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(() => calculations.getWeekStart(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => calculations.getMonthStart(new Date()));
  const [isEditMode, setIsEditMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSettling, setIsSettling] = useState(false);
  const [noTransition, setNoTransition] = useState(false);
  const dragStartY = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TASK_CARD_HEIGHT = 82; // 70px card + 12px gap

  const { tasks, moveTaskToPosition } = useTasks();
  const {
    completionIndex,
    toggleTaskCompletion,
    updateTaskValue: updateStatsTaskValue,
    getDailyScore,
    getStreakAsOfDate,
  } = useStats();

  // ── Boundary checks ──────────────────────────────────────────────────────

  const isToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return sel.getTime() === today.getTime();
  }, [selectedDate]);

  const isCurrentWeek = useCallback(() => {
    const cw = getWeekStart(new Date());
    return selectedWeek.getTime() === cw.getTime();
  }, [selectedWeek]);

  const isCurrentMonth = useCallback(() => {
    const now = new Date();
    return selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth();
  }, [selectedMonth]);

  // ── Data computation functions ──────────────────────────────────────────

  const computeDayData = useCallback((date: Date) => {
    const dateStr = calculations.formatDate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    const isFuture = check > today;

    const scheduledTasks = tasks.filter(task =>
      calculations.isTaskScheduledForDate(task as calculations.Task, date)
    );

    const tasksWithStatus = scheduledTasks.map(task => {
      const completion = completionIndex.get(`${task.id}:${dateStr}`);
      return {
        ...task,
        completed: completion?.completed ?? false,
        value: completion?.value,
      };
    }).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    const dailyScore = getDailyScore(date);

    return {
      tasks: tasksWithStatus,
      score: isFuture ? 0 : dailyScore.score,
      completionPercent: isFuture ? 0 : (dailyScore.tasksScheduled > 0
        ? Math.round((dailyScore.tasksCompleted / dailyScore.tasksScheduled) * 100)
        : 0),
    };
  }, [tasks, completionIndex, getDailyScore]);

  const computeWeekData = useCallback((ws: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const days: DayData[] = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(ws);
      dayDate.setDate(ws.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);
      const isFuture = dayDate > today;
      const dailyScore = getDailyScore(dayDate);

      days.push({
        dayName: dayNames[i],
        date: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: dayDate,
        tasksCompleted: dailyScore.tasksCompleted,
        totalTasks: dailyScore.tasksScheduled,
        score: isFuture ? null : (dailyScore.tasksScheduled > 0 ? dailyScore.score : null),
        isFuture,
      });
    }

    const activeDays = days.filter(d => !d.isFuture && d.tasksCompleted > 0);
    const avgScore = activeDays.length > 0
      ? Math.round(activeDays.reduce((sum, d) => sum + (d.score || 0), 0) / activeDays.length) : 0;
    const avgCompletion = activeDays.length > 0
      ? Math.round(activeDays.reduce((sum, d) => sum + (d.totalTasks > 0 ? (d.tasksCompleted / d.totalTasks) * 100 : 0), 0) / activeDays.length) : 0;

    return { days, avgScore, avgCompletion, daysActive: activeDays.length };
  }, [getDailyScore]);

  const computeMonthData = useCallback((ms: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = ms.getFullYear();
    const month = ms.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const cells: DayCell[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, score: null, isFuture: false, isToday: false });
    }

    let totalScore = 0;
    let totalCompletion = 0;
    let activeDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      dayDate.setHours(0, 0, 0, 0);
      const isFuture = dayDate > today;
      const isDayToday = dayDate.getTime() === today.getTime();
      const dailyScore = getDailyScore(dayDate);
      const score = isFuture ? null : (dailyScore.tasksScheduled > 0 ? dailyScore.score : null);

      if (!isFuture && dailyScore.tasksCompleted > 0) {
        totalScore += dailyScore.score;
        totalCompletion += dailyScore.tasksScheduled > 0
          ? (dailyScore.tasksCompleted / dailyScore.tasksScheduled) * 100
          : 0;
        activeDays++;
      }

      cells.push({ day: d, score, isFuture, isToday: isDayToday });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, score: null, isFuture: false, isToday: false });
    }

    const avgScore = activeDays > 0 ? Math.round(totalScore / activeDays) : 0;
    const avgCompletion = activeDays > 0 ? Math.round(totalCompletion / activeDays) : 0;

    return { cells, avgScore, avgCompletion, daysActive: activeDays };
  }, [getDailyScore]);

  // ── Current period data ──────────────────────────────────────────────────

  const dayData = useMemo(() => computeDayData(selectedDate), [computeDayData, selectedDate]);
  const currentStreak = useMemo(() => getStreakAsOfDate(selectedDate), [getStreakAsOfDate, selectedDate]);
  const weekData = useMemo(() => computeWeekData(selectedWeek), [computeWeekData, selectedWeek]);
  const monthData = useMemo(() => computeMonthData(selectedMonth), [computeMonthData, selectedMonth]);

  // ── Adjacent period data (for swipe preview) ────────────────────────────

  const adjacentPeriods = useMemo(() => {
    if (viewMode === 'daily') {
      const prev = new Date(selectedDate);
      prev.setDate(prev.getDate() - 1);
      const next = isToday() ? null : (() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); return d; })();
      return { prevDate: prev, nextDate: next };
    }
    if (viewMode === 'weekly') {
      const prev = new Date(selectedWeek);
      prev.setDate(prev.getDate() - 7);
      const next = isCurrentWeek() ? null : (() => { const w = new Date(selectedWeek); w.setDate(w.getDate() + 7); return w; })();
      return { prevWeek: prev, nextWeek: next };
    }
    const prev = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    const next = isCurrentMonth() ? null : new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    return { prevMonth: prev, nextMonth: next };
  }, [viewMode, selectedDate, selectedWeek, selectedMonth, isToday, isCurrentWeek, isCurrentMonth]);

  const prevPeriodData = useMemo(() => {
    if (viewMode === 'daily' && 'prevDate' in adjacentPeriods) return { day: computeDayData(adjacentPeriods.prevDate!), streak: getStreakAsOfDate(adjacentPeriods.prevDate!) };
    if (viewMode === 'weekly' && 'prevWeek' in adjacentPeriods) return { week: computeWeekData(adjacentPeriods.prevWeek!) };
    if (viewMode === 'monthly' && 'prevMonth' in adjacentPeriods) return { month: computeMonthData(adjacentPeriods.prevMonth!) };
    return null;
  }, [viewMode, adjacentPeriods, computeDayData, computeWeekData, computeMonthData, getStreakAsOfDate]);

  const nextPeriodData = useMemo(() => {
    if (viewMode === 'daily' && 'nextDate' in adjacentPeriods && adjacentPeriods.nextDate) return { day: computeDayData(adjacentPeriods.nextDate), streak: getStreakAsOfDate(adjacentPeriods.nextDate) };
    if (viewMode === 'weekly' && 'nextWeek' in adjacentPeriods && adjacentPeriods.nextWeek) return { week: computeWeekData(adjacentPeriods.nextWeek) };
    if (viewMode === 'monthly' && 'nextMonth' in adjacentPeriods && adjacentPeriods.nextMonth) return { month: computeMonthData(adjacentPeriods.nextMonth) };
    return null;
  }, [viewMode, adjacentPeriods, computeDayData, computeWeekData, computeMonthData, getStreakAsOfDate]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigatePrev = () => {
    setIsEditMode(false);
    if (viewMode === 'daily') {
      setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
    } else if (viewMode === 'weekly') {
      setSelectedWeek(prev => { const w = new Date(prev); w.setDate(w.getDate() - 7); return w; });
    } else {
      setSelectedMonth(prev => { const m = new Date(prev); m.setMonth(m.getMonth() - 1); return m; });
    }
  };

  const navigateNext = () => {
    setIsEditMode(false);
    if (viewMode === 'daily' && !isToday()) {
      setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
    } else if (viewMode === 'weekly' && !isCurrentWeek()) {
      setSelectedWeek(prev => { const w = new Date(prev); w.setDate(w.getDate() + 7); return w; });
    } else if (viewMode === 'monthly' && !isCurrentMonth()) {
      setSelectedMonth(prev => { const m = new Date(prev); m.setMonth(m.getMonth() + 1); return m; });
    }
  };

  const isNextDisabled =
    (viewMode === 'daily' && isToday()) ||
    (viewMode === 'weekly' && isCurrentWeek()) ||
    (viewMode === 'monthly' && isCurrentMonth());

  // ── Formatting ────────────────────────────────────────────────────────────

  const formatDateLabel = () => {
    if (viewMode === 'daily') {
      return selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (viewMode === 'weekly') {
      const weekEnd = new Date(selectedWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${selectedWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2013 ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };


  // ── Ring values ───────────────────────────────────────────────────────────

  const ringScore = viewMode === 'daily' ? dayData.score
    : viewMode === 'weekly' ? weekData.avgScore
    : monthData.avgScore;
  const ringCompletion = viewMode === 'daily' ? dayData.completionPercent
    : viewMode === 'weekly' ? weekData.avgCompletion
    : monthData.avgCompletion;
  const ringThirdValue = viewMode === 'daily' ? currentStreak
    : viewMode === 'weekly' ? weekData.daysActive
    : monthData.daysActive;
  const ringThirdLabel = viewMode === 'daily' ? 'Streak' : 'Days Active';
  const ringThirdMax = viewMode === 'daily' ? undefined
    : viewMode === 'weekly' ? 7
    : new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleAddTask = () => {
    const dateStr = calculations.formatDate(selectedDate);
    onAddTask?.(dateStr);
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    setSelectedDate(newDate);
    setViewMode('daily');
  };

  const handleWeekDayPress = (date: Date) => {
    setSelectedDate(date);
    setViewMode('daily');
  };

  // ── Swipe key ───────────────────────────────────────────────────────────

  const swipeKey = useMemo(() => {
    if (viewMode === 'daily') return `daily-${calculations.formatDate(selectedDate)}`;
    if (viewMode === 'weekly') return `weekly-${calculations.formatDate(selectedWeek)}`;
    return `monthly-${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`;
  }, [viewMode, selectedDate, selectedWeek, selectedMonth]);

  // ── Content rendering helpers ───────────────────────────────────────────

  const actionButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: 12,
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center' as const,
    marginTop: 8,
  };

  const navArrowStyle: React.CSSProperties = {
    padding: 8,
    fontSize: 24,
    color: colors.textMuted,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    lineHeight: 1,
  };

  // ── Drag-to-reorder handlers (matching mobile DraggableTaskCard) ────────
  const handleDragStart = useCallback((index: number, clientY: number) => {
    setDragIndex(index);
    setDragOffset(0);
    dragStartY.current = clientY;
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (dragIndex === null) return;
    setDragOffset(clientY - dragStartY.current);
  }, [dragIndex]);

  const handleDragEnd = useCallback((sortedTasks: (Task & { completed: boolean; value?: number })[]) => {
    if (dragIndex === null) return;
    const movedBy = Math.round(dragOffset / TASK_CARD_HEIGHT);
    const toIndex = Math.max(0, Math.min(sortedTasks.length - 1, dragIndex + movedBy));
    // Snap to the target slot position with a transition
    const snapOffset = movedBy * TASK_CARD_HEIGHT;
    setDragOffset(snapOffset);
    setIsSettling(true);
    // After the transition completes, do the actual reorder and reset
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      // Disable transitions so the DOM reorder + transform reset is invisible
      setNoTransition(true);
      if (dragIndex !== toIndex) {
        const taskId = sortedTasks[dragIndex].id;
        moveTaskToPosition(taskId, toIndex);
      }
      setDragIndex(null);
      setDragOffset(0);
      setIsSettling(false);
      // Re-enable transitions on the next frame
      requestAnimationFrame(() => {
        setNoTransition(false);
      });
    }, 200);
  }, [dragIndex, dragOffset, moveTaskToPosition, TASK_CARD_HEIGHT]);

  // Global mouse handlers for drag
  useEffect(() => {
    if (dragIndex === null || isSettling) return;
    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleDragMove(e.clientY);
    };
    const onMouseUp = () => handleDragEnd(dayData.tasks);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => handleDragEnd(dayData.tasks);
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
  }, [dragIndex, isSettling, handleDragMove, handleDragEnd, dayData.tasks]);

  // Compute shift for non-dragged cards
  const getCardShift = useCallback((index: number) => {
    if (dragIndex === null) return 0;
    if (dragIndex === index) return 0; // dragged card uses dragOffset directly
    const draggedToPosition = dragIndex + Math.round(dragOffset / TASK_CARD_HEIGHT);
    if (dragIndex < index && draggedToPosition >= index) return -TASK_CARD_HEIGHT;
    if (dragIndex > index && draggedToPosition <= index) return TASK_CARD_HEIGHT;
    return 0;
  }, [dragIndex, dragOffset, TASK_CARD_HEIGHT]);

  const renderSwipeContent = (content: React.ReactNode) => (
    <div style={{ backgroundColor: colors.background, minHeight: '100%', paddingLeft: 16, paddingRight: 16, paddingBottom: 16 }}>
      {content}
    </div>
  );

  const renderDailyContent = (data: typeof dayData, interactive: boolean) => {
    const sortedTasks = data.tasks;
    return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
        {sortedTasks.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: '40px 20px' }}>
            <p style={{ color: colors.textMuted, fontSize: 15, margin: 0 }}>No tasks scheduled for this day</p>
          </div>
        ) : (
          sortedTasks.map((task, index) => {
            const isDragging = dragIndex === index;
            const shift = getCardShift(index);
            return (
              <div
                key={task.id}
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
                  if (!isEditMode || !interactive) return;
                  e.preventDefault();
                  handleDragStart(index, e.clientY);
                }}
                onTouchStart={(e) => {
                  if (!isEditMode || !interactive) return;
                  handleDragStart(index, e.touches[0].clientY);
                }}
              >
                <div style={{
                  animation: isEditMode && !isDragging ? 'taskShake 240ms ease-in-out infinite alternate' : 'none',
                }}>
                  <TaskCardInline
                    task={task}
                    disabled={!interactive}
                    onToggle={() => { if (interactive && !isEditMode) toggleTaskCompletion(task.id, selectedDate); }}
                    onValueChange={(value) => { if (interactive && !isEditMode) updateStatsTaskValue(task.id, value ?? 0, selectedDate); }}
                    onPress={() => { if (interactive && !isEditMode) onNavigateToTask?.(task.id); }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      {interactive && !isEditMode && (
        <button onClick={handleAddTask} style={actionButtonStyle}>Add Task</button>
      )}
      {interactive && sortedTasks.length > 1 && (
        <button onClick={() => {
          if (isEditMode) {
            // Finalize drag on Done
            if (dragIndex !== null) handleDragEnd(sortedTasks);
          }
          setIsEditMode(prev => !prev);
        }} style={actionButtonStyle}>
          {isEditMode ? 'Done' : 'Edit Order'}
        </button>
      )}
    </div>
  );
  };

  const renderWeeklyContent = (data: typeof weekData, interactive: boolean) => (
    <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.days.map((day, i) => (
        <DayRow
          key={i}
          day={day}
          onPress={() => { if (interactive) handleWeekDayPress(day.fullDate); }}
        />
      ))}
    </div>
  );

  const renderMonthlyContent = (data: typeof monthData, interactive: boolean) => (
    <div style={{ paddingTop: 8 }}>
      <CalendarGrid
        days={data.cells}
        onDayPress={(day) => { if (interactive) handleDayPress(day); }}
      />
    </div>
  );

  // ── Build swipe panels (task content only, rings stay fixed) ────────────

  // Only allow interaction on today and yesterday (daily view)
  const canInteract = viewMode === 'daily' ? calculations.canEditDate(selectedDate).canEdit : true;

  const currentSwipeContent = renderSwipeContent(
    viewMode === 'daily' ? renderDailyContent(dayData, canInteract)
      : viewMode === 'weekly' ? renderWeeklyContent(weekData, true)
      : renderMonthlyContent(monthData, true)
  );

  const buildPrevContent = () => {
    if (!prevPeriodData) return undefined;
    if (viewMode === 'daily' && 'day' in prevPeriodData) {
      const pd = prevPeriodData as { day: typeof dayData; streak: number };
      return renderSwipeContent(renderDailyContent(pd.day, false));
    }
    if (viewMode === 'weekly' && 'week' in prevPeriodData) {
      const pw = prevPeriodData as { week: typeof weekData };
      return renderSwipeContent(renderWeeklyContent(pw.week, false));
    }
    if (viewMode === 'monthly' && 'month' in prevPeriodData) {
      const pm = prevPeriodData as { month: typeof monthData };
      return renderSwipeContent(renderMonthlyContent(pm.month, false));
    }
    return undefined;
  };

  const buildNextContent = () => {
    if (!nextPeriodData) return undefined;
    if (viewMode === 'daily' && 'day' in nextPeriodData) {
      const nd = nextPeriodData as { day: typeof dayData; streak: number };
      return renderSwipeContent(renderDailyContent(nd.day, false));
    }
    if (viewMode === 'weekly' && 'week' in nextPeriodData) {
      const nw = nextPeriodData as { week: typeof weekData };
      return renderSwipeContent(renderWeeklyContent(nw.week, false));
    }
    if (viewMode === 'monthly' && 'month' in nextPeriodData) {
      const nm = nextPeriodData as { month: typeof monthData };
      return renderSwipeContent(renderMonthlyContent(nm.month, false));
    }
    return undefined;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: colors.background, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* View Mode Selector (fixed, not swiped) */}
      <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 16, flexShrink: 0 }}>
        <div style={{
          display: 'flex',
          backgroundColor: colors.elevated,
          borderRadius: 10,
          padding: 4,
        }}>
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setIsEditMode(false); }}
              style={{
                flex: 1,
                paddingTop: 12, paddingBottom: 12,
                paddingLeft: 16, paddingRight: 16,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: viewMode === mode ? colors.textPrimary : colors.textMuted,
                backgroundColor: viewMode === mode ? colors.border : 'transparent',
                textAlign: 'center' as const,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation (fixed) */}
      <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
          <button onClick={navigatePrev} style={navArrowStyle}>{'\u2039'}</button>
          <span style={{ fontSize: 17, fontWeight: 600, color: colors.textPrimary }}>{formatDateLabel()}</span>
          <button onClick={navigateNext} disabled={isNextDisabled} style={{ ...navArrowStyle, color: isNextDisabled ? colors.textFaint : colors.textMuted, opacity: isNextDisabled ? 0.3 : 1, cursor: isNextDisabled ? 'default' : 'pointer' }}>{'\u203A'}</button>
        </div>

        {/* Progress Rings (fixed) */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: 12 }}>
          <StatRing percent={ringScore} label="Score" size={88} strokeWidth={8} showPercentSymbol={false} />
          <StatRing percent={ringCompletion} label="Completion" size={88} strokeWidth={8} showPercentSymbol={true} />
          <StreakRingComponent value={ringThirdValue} maxValue={ringThirdMax} size={88} strokeWidth={8} label={ringThirdLabel} />
        </div>
      </div>

      {/* Swipeable task content only */}
      <SwipeableView
        prevContent={buildPrevContent()}
        nextContent={buildNextContent()}
        onSwipePrev={navigatePrev}
        onSwipeNext={navigateNext}
        swipeKey={swipeKey}
      >
        {currentSwipeContent}
      </SwipeableView>
    </div>
  );
}
