'use client';

import { useMemo, useId } from 'react';
import { useTasks } from '@/contexts/TaskContext';
import { useStats } from '@/contexts/StatsContext';
import { getGoalColor } from '@/shared';

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

interface TaskHistoryViewProps {
  taskId: number;
  onBack?: () => void;
}

export default function TaskHistoryView({ taskId, onBack }: TaskHistoryViewProps) {
  const { tasks } = useTasks();
  const { completions } = useStats();

  const task = tasks.find(t => t.id === taskId);
  const goalColor = task ? getGoalColor(task.goalPriority) : { main: '#00FFFF' };
  const mainColor = typeof goalColor === 'object' && 'main' in goalColor ? goalColor.main : '#4B5563';

  const completionHistory = useMemo(() => {
    if (!task) return {};
    const history: { [date: string]: boolean } = {};
    completions.forEach(c => {
      if (c.taskId === taskId && c.completed) {
        history[c.date] = true;
      }
    });
    return history;
  }, [task, taskId, completions]);

  if (!task) {
    return (
      <div style={s.container}>
        <div style={s.sheet}>
          {/* Pull indicator */}
          <div style={s.pullIndicatorContainer}>
            <div style={s.pullIndicator} />
          </div>
          <div style={s.notFoundContainer}>
            <span style={s.notFoundText}>Task not found</span>
            <button onClick={() => onBack?.()} style={s.closeButton}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.sheet}>
        {/* Pull indicator */}
        <div style={s.pullIndicatorContainer}>
          <div style={s.pullIndicator} />
        </div>

        {/* Scrollable content with TaskHistoryGrid */}
        <div style={s.scrollContent}>
          <HistoryGrid
            taskName={task.name}
            goalColor={{ main: mainColor }}
            selectedDays={task.selectedDays}
            completionHistory={completionHistory}
            startDate={new Date(task.createdAt)}
            onDone={() => onBack?.()}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Inline History Grid (matching mobile TaskHistoryGrid exactly)
// ============================================

const DOT_SIZE = 28;
const DOT_GAP = 4;

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
  const filterId = `ring-glow-history-${useId().replace(/:/g, '')}`;

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

interface HistoryGridProps {
  taskName?: string;
  goalColor: { main: string };
  selectedDays: number[];
  completionHistory?: { [date: string]: boolean };
  startDate?: Date;
  onDone?: () => void;
}

function HistoryGrid({
  taskName,
  goalColor,
  selectedDays,
  completionHistory,
  startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  onDone,
}: HistoryGridProps) {
  const weeks = useMemo(() => {
    const history = completionHistory || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
        const dateStr = formatDateStr(dayDate);
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
      {/* Task name header with Done button */}
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
                    title={`${formatDateStr(day.date)}: ${day.status === 'completed' ? 'Completed' : day.status === 'missed' ? 'Missed' : day.status}`}
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
// Styles (matching mobile history screen exactly)
// ============================================
const s: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    height: '100%',
  },
  sheet: {
    backgroundColor: '#121212',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingTop: 12,
    paddingBottom: 20,
  },
  pullIndicatorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  pullIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
  },
  scrollContent: {
    flex: 1,
    overflowY: 'auto',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 16,
    paddingBottom: 40,
    display: 'flex',
    flexDirection: 'column',
  },
  notFoundContainer: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  },
  notFoundText: {
    color: '#6B6B6B',
    fontSize: 15,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#111111',
    border: '1px solid #1A1A1A',
    borderRadius: 12,
    padding: 12,
    paddingLeft: 32,
    paddingRight: 32,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
