'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useTasks, Task } from '@/contexts/TaskContext';
import { useGoals } from '@/contexts/GoalContext';
import { SwipeableView } from '@/components/ui/SwipeableView';
import * as calculations from '@maai/shared';
import { getGoalColor, getTierByPercentage } from '@maai/shared';

// ========================================
// CONSTANTS (matching mobile exactly)
// ========================================
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 20;
const CARD_HEIGHT = 160;
const RING_SIZE = 70;
const RING_STROKE = 6;

// 6-tier color system
const TIER_COLORS: Record<number, string> = {
  1: '#00FFFF',
  2: '#38BDF8',
  3: '#2563EB',
  4: '#A78BFA',
  5: '#7C3AED',
  6: '#4B5563',
};

const getTierNumber = (percent: number): number => {
  if (percent >= 90) return 1;
  if (percent >= 70) return 2;
  if (percent >= 50) return 3;
  if (percent >= 30) return 4;
  if (percent >= 10) return 5;
  return 6;
};

const getColorForPercent = (percent: number): string => {
  return TIER_COLORS[getTierNumber(percent)];
};

type TimeframeType = 'week' | 'month' | 'all';

// ========================================
// DATA SHAPE
// ========================================
interface StatsData {
  score: number;
  completion: number;
  consistency: number;
  streak: { best: number; max: number };
  trend: 'improving' | 'stable' | 'declining';
  trendSubtext: string;
  completionByImportance: { level: string; rate: number }[];
  completionByDifficulty: { level: string; rate: number }[];
  perfectDays: { count: number; total: number };
  bestScore: number;
  bestScoreSubtext: string;
  topTask: { name: string; completed: number; total: number };
  bottomTask: { name: string; completed: number; total: number };
}

// ========================================
// PREMIUM RING (SVG with glow, matching mobile Skia ring)
// ========================================
function PremiumRing({ percent, size = RING_SIZE, strokeWidth = RING_STROKE, showPercent = false }: {
  percent: number; size?: number; strokeWidth?: number; showPercent?: boolean;
}) {
  const safePercent = Math.max(0, Math.min(100, percent || 0));
  const color = getColorForPercent(safePercent);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safePercent / 100) * circumference;

  const glowFilterId = `premium-ring-glow-${size}-${strokeWidth}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <defs>
            <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1A1A1A" strokeWidth={strokeWidth} />
          {/* Glow */}
          {safePercent > 0 && (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              filter={`url(#${glowFilterId})`}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
          )}
          {/* Main arc */}
          {safePercent > 0 && (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
          )}
        </svg>
        {/* Center value */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: size, height: size,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
            {safePercent}
            {showPercent && <span style={{ fontSize: 10, fontWeight: 600, color: '#6B6B6B' }}>%</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// SMALL RING (value/max based)
// ========================================
function SmallRing({ value, max = 100, showPercent = false, size = RING_SIZE, strokeWidth = RING_STROKE }: {
  value: number; max?: number; showPercent?: boolean; size?: number; strokeWidth?: number;
}) {
  const safeValue = value || 0;
  const safeMax = max || 100;
  const percent = safeMax > 0 ? (safeValue / safeMax) * 100 : 0;
  const safePercent = Math.max(0, Math.min(100, percent));
  const color = getColorForPercent(safePercent);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safePercent / 100) * circumference;

  const glowFilterId = `small-ring-glow-${size}-${strokeWidth}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <defs>
            <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1A1A1A" strokeWidth={strokeWidth} />
          {safePercent > 0 && (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              filter={`url(#${glowFilterId})`}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
          )}
          {safePercent > 0 && (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
          )}
        </svg>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: size, height: size,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
            {safeValue}
            {showPercent && <span style={{ fontSize: 10, fontWeight: 600, color: '#6B6B6B' }}>%</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// STAT CARD COMPONENTS (matching mobile)
// ========================================

function MainRingsCard({ data }: { data: StatsData }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.cardTitle}>OVERVIEW</span>
      <div style={styles.threeRingsRow}>
        <div style={styles.ringSlot}><PremiumRing percent={data.score} /></div>
        <div style={styles.ringSlot}><PremiumRing percent={data.completion} showPercent /></div>
        <div style={styles.ringSlot}><PremiumRing percent={data.consistency} showPercent /></div>
      </div>
      <div style={styles.cardSubtextRow}>
        <span style={styles.cardSubtext}>Score</span>
        <span style={styles.cardSubtext}>Completion</span>
        <span style={styles.cardSubtext}>Consistency</span>
      </div>
    </div>
  );
}

function TrendCard({ data }: { data: StatsData }) {
  const isImproving = data.trend === 'improving';
  const isStable = data.trend === 'stable';
  const color = isImproving ? '#00FFFF' : isStable ? '#2563EB' : '#A78BFA';
  const arrow = isImproving ? '\u2191' : isStable ? '\u2192' : '\u2193';
  const label = isImproving ? 'Improving' : isStable ? 'Stable' : 'Declining';
  return (
    <div style={styles.halfCard}>
      <span style={styles.halfCardLabel}>TREND</span>
      <div style={{
        ...styles.trendPill,
        backgroundColor: `${color}30`,
        borderColor: color,
      }}>
        <span style={{ fontSize: 20, color: '#FFFFFF' }}>{arrow}</span>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>{label}</span>
      </div>
      <span style={styles.halfCardSubtext}>{data.trendSubtext}</span>
    </div>
  );
}

function StreakCard({ timeframe, data }: { timeframe: TimeframeType; data: StatsData }) {
  const subtext = timeframe === 'week' ? 'Best This Week' : timeframe === 'month' ? 'Best This Month' : 'Best All Time';
  return (
    <div style={styles.halfCard}>
      <span style={styles.halfCardLabel}>STREAK</span>
      <SmallRing value={data.streak.best} max={data.streak.max} />
      <span style={styles.halfCardSubtext}>{subtext}</span>
    </div>
  );
}

function TaskImportanceCard({ data }: { data: StatsData }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.cardTitle}>TASK IMPORTANCE</span>
      <div style={styles.threeRingsRow}>
        {data.completionByImportance.map((item, idx) => (
          <div key={`imp-ring-${idx}`} style={styles.ringSlot}><SmallRing value={item.rate} showPercent /></div>
        ))}
      </div>
      <div style={styles.cardSubtextRow}>
        {data.completionByImportance.map((item, idx) => (
          <span key={`imp-label-${idx}`} style={styles.cardSubtext}>{item.level}</span>
        ))}
      </div>
    </div>
  );
}

function TaskDifficultyCard({ data }: { data: StatsData }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.cardTitle}>TASK DIFFICULTY</span>
      <div style={styles.threeRingsRow}>
        {data.completionByDifficulty.map((item, idx) => (
          <div key={`diff-ring-${idx}`} style={styles.ringSlot}><SmallRing value={item.rate} showPercent /></div>
        ))}
      </div>
      <div style={styles.cardSubtextRow}>
        {data.completionByDifficulty.map((item, idx) => (
          <span key={`diff-label-${idx}`} style={styles.cardSubtext}>{item.level}</span>
        ))}
      </div>
    </div>
  );
}

function PerfectDaysCard({ data }: { data: StatsData }) {
  return (
    <div style={styles.halfCard}>
      <span style={styles.halfCardLabel}>PERFECT DAYS</span>
      <SmallRing value={data.perfectDays.count} max={data.perfectDays.total} />
      <span style={styles.halfCardSubtext}>{data.perfectDays.count}/{data.perfectDays.total} Days</span>
    </div>
  );
}

function BestScoreCard({ data }: { data: StatsData }) {
  return (
    <div style={styles.halfCard}>
      <span style={styles.halfCardLabel}>BEST SCORE</span>
      <SmallRing value={data.bestScore} />
      <span style={styles.halfCardSubtext}>{data.bestScoreSubtext}</span>
    </div>
  );
}

function TopTaskCard({ data }: { data: StatsData }) {
  const { completed, total, name } = data.topTask;
  const percent = total > 0 ? (completed / total) * 100 : 0;
  const color = getColorForPercent(percent);
  return (
    <div style={styles.halfCard}>
      <span style={styles.halfCardLabel}>HIGHEST TASK</span>
      <div style={{
        ...styles.trendPill,
        backgroundColor: `${color}30`,
        borderColor: color,
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>{completed}/{total}</span>
      </div>
      <span style={styles.halfCardSubtext}>{name || 'No Tasks'}</span>
    </div>
  );
}

function BottomTaskCard({ data }: { data: StatsData }) {
  const { completed, total, name } = data.bottomTask;
  const percent = total > 0 ? (completed / total) * 100 : 0;
  const color = getColorForPercent(percent);
  return (
    <div style={styles.halfCard}>
      <span style={styles.halfCardLabel}>LOWEST TASK</span>
      <div style={{
        ...styles.trendPill,
        backgroundColor: `${color}30`,
        borderColor: color,
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>{completed}/{total}</span>
      </div>
      <span style={styles.halfCardSubtext}>{name || 'No Tasks'}</span>
    </div>
  );
}

// ========================================
// NUMERIC TASK CHART (SVG line chart)
// ========================================
function NumericTaskChart({ task, timeframe, periodOffset = 0 }: { task: Task; timeframe: TimeframeType; periodOffset: number }) {
  const stats = useStats();
  const chartWidth = 340;
  const chartHeight = 75;

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getChartData = (): { day: string; value: number }[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (timeframe === 'week') {
      const currentWeekStart = calculations.getWeekStart(today);
      const weekStart = calculations.addDays(currentWeekStart, periodOffset * 7);
      const weekEnd = calculations.addDays(weekStart, 6);
      const end = weekEnd > today ? today : weekEnd;
      const result: { day: string; value: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const date = calculations.addDays(weekStart, i);
        if (date > end) { result.push({ day: dayLabels[i], value: 0 }); continue; }
        const dateStr = calculations.formatDate(date);
        const comp = stats.completionIndex.get(`${task.id}:${dateStr}`);
        result.push({ day: dayLabels[i], value: (comp as any)?.value ?? 0 });
      }
      return result;
    } else if (timeframe === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth() + periodOffset, 1);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const end = monthEnd > today ? today : monthEnd;
      const weeks: { day: string; values: number[] }[] = [];
      let weekNum = 1;
      let currentWeekValues: number[] = [];
      const cursor = new Date(monthStart);
      while (cursor <= end) {
        const dateStr = calculations.formatDate(cursor);
        const comp = stats.completionIndex.get(`${task.id}:${dateStr}`);
        currentWeekValues.push((comp as any)?.value ?? 0);
        const nextDay = calculations.addDays(cursor, 1);
        if (cursor.getDay() === 0 || nextDay > end) {
          weeks.push({ day: `W${weekNum}`, values: currentWeekValues });
          weekNum++;
          currentWeekValues = [];
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      return weeks.map(w => {
        const nonZero = w.values.filter(v => v > 0);
        const avg = nonZero.length > 0 ? Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length) : 0;
        return { day: w.day, value: avg };
      }).filter((_, i, arr) => {
        const lastDataIndex = arr.reduce((last, item, idx) => item.value > 0 ? idx : last, -1);
        return i <= lastDataIndex;
      });
    } else {
      const months: Map<string, number[]> = new Map();
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      for (const comp of stats.completionIndex.values()) {
        if ((comp as any).taskId !== task.id || (comp as any).value == null) continue;
        const [year, month] = (comp as any).date.split('-').map(Number);
        const compDate = new Date(year, month - 1, 1);
        if (compDate < sixMonthsAgo) continue;
        const key = `${year}-${month}`;
        if (!months.has(key)) months.set(key, []);
        months.get(key)!.push((comp as any).value);
      }
      const sorted = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      return sorted.map(([key, values]) => {
        const [, month] = key.split('-').map(Number);
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        return { day: shortMonths[month - 1], value: avg };
      });
    }
  };

  const data = getChartData();
  const hasData = data.some(d => d.value > 0);

  if (data.length === 1 && hasData) {
    data.push({ day: data[0].day, value: data[0].value });
  }

  const dataMin = Math.min(...data.map(d => d.value));
  const dataMax = Math.max(...data.map(d => d.value));
  const dataRange = dataMax - dataMin || 1;
  const padding = dataRange * 0.15;
  const displayMin = Math.max(0, dataMin - padding);
  const displayMax = dataMax + padding;
  const displayRange = displayMax - displayMin;

  const formatValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return Math.round(val).toString();
  };

  if (!hasData || data.length < 2) {
    return (
      <div style={styles.chartCard}>
        <span style={styles.cardTitle}>{task.name.toUpperCase()}</span>
        <div style={{ height: chartHeight, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span style={styles.halfCardSubtextStatic}>No data yet</span>
        </div>
      </div>
    );
  }

  const stepX = chartWidth / (data.length - 1);
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartHeight - ((d.value - displayMin) / displayRange) * chartHeight,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L 0 ${chartHeight} Z`;
  const gradId = `lineGrad-${task.id}`;
  const areaGradId = `areaGrad-${task.id}`;

  return (
    <div style={styles.chartCard}>
      <span style={styles.cardTitle}>{task.name.toUpperCase()}</span>
      <div style={styles.chartContainer}>
        <div style={styles.yAxis}>
          <span style={styles.axisLabel}>{formatValue(displayMax)}</span>
          <span style={styles.axisLabel}>{formatValue((displayMax + displayMin) / 2)}</span>
          <span style={styles.axisLabel}>{formatValue(displayMin)}</span>
        </div>
        <div style={{ flex: 1 }}>
          <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="30%" stopColor="#A78BFA" />
                <stop offset="60%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#00FFFF" />
              </linearGradient>
              <linearGradient id={areaGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            <path d={`M 0 0 L ${chartWidth} 0`} stroke="#1A1A1A" strokeWidth={1} />
            <path d={`M 0 ${chartHeight / 2} L ${chartWidth} ${chartHeight / 2}`} stroke="#1A1A1A" strokeWidth={1} strokeDasharray="4,4" />
            <path d={`M 0 ${chartHeight} L ${chartWidth} ${chartHeight}`} stroke="#1A1A1A" strokeWidth={1} />
            {/* Area fill */}
            <path d={areaPath} fill={`url(#${areaGradId})`} />
            {/* Glow line */}
            <path d={linePath} fill="none" stroke={`url(#${gradId})`} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
            {/* Main line */}
            <path d={linePath} fill="none" stroke={`url(#${gradId})`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots */}
            {points.map((p, i) => {
              const t = points.length > 1 ? i / (points.length - 1) : 0;
              let dotColor: string;
              if (t <= 0.3) {
                const lt = t / 0.3;
                dotColor = `rgb(${Math.round(124 + (167 - 124) * lt)},${Math.round(58 + (139 - 58) * lt)},${Math.round(237 + (250 - 237) * lt)})`;
              } else if (t <= 0.6) {
                const lt = (t - 0.3) / 0.3;
                dotColor = `rgb(${Math.round(167 + (56 - 167) * lt)},${Math.round(139 + (189 - 139) * lt)},${Math.round(250 + (248 - 250) * lt)})`;
              } else {
                const lt = (t - 0.6) / 0.4;
                dotColor = `rgb(${Math.round(56 + (0 - 56) * lt)},${Math.round(189 + (255 - 189) * lt)},${Math.round(248 + (255 - 248) * lt)})`;
              }
              return (
                <React.Fragment key={`dot-${i}`}>
                  <circle cx={p.x} cy={p.y} r={6} fill={dotColor} opacity={0.3} />
                  <circle cx={p.x} cy={p.y} r={4} fill="#0D0D0D" />
                  <circle cx={p.x} cy={p.y} r={4} fill="none" stroke={dotColor} strokeWidth={2} />
                </React.Fragment>
              );
            })}
          </svg>
          <div style={styles.xAxis}>
            {data.map((d, i) => <span key={i} style={styles.axisLabel}>{d.day}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// STAT CONFIG
// ========================================
type CoreStatId = 'main-rings' | 'trend' | 'streak' | 'importance' | 'difficulty' | 'perfect-days' | 'best-score' | 'top-task' | 'bottom-task';
type StatId = CoreStatId | `numeric-${number}`;

interface StatConfig {
  id: StatId;
  name: string;
  width: 'full' | 'half';
  removable: boolean;
}

const coreStats: StatConfig[] = [
  { id: 'main-rings', name: 'Main Rings', width: 'full', removable: false },
  { id: 'trend', name: 'Trend', width: 'half', removable: false },
  { id: 'streak', name: 'Streak', width: 'half', removable: false },
  { id: 'importance', name: 'Task Importance', width: 'full', removable: true },
  { id: 'difficulty', name: 'Task Difficulty', width: 'full', removable: true },
  { id: 'perfect-days', name: 'Perfect Days', width: 'half', removable: true },
  { id: 'best-score', name: 'Best Score', width: 'half', removable: true },
  { id: 'top-task', name: 'Highest Task', width: 'half', removable: true },
  { id: 'bottom-task', name: 'Lowest Task', width: 'half', removable: true },
];

// ========================================
// MAIN COMPONENT
// ========================================
export default function StatsView() {
  const stats = useStats();
  const { tasks } = useTasks();
  const { goals } = useGoals();
  const [timeframe, setTimeframe] = useState<TimeframeType>('week');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [enabledStats, setEnabledStats] = useState<StatId[]>([
    'main-rings', 'trend', 'streak', 'importance', 'difficulty', 'perfect-days', 'best-score',
  ]);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Generate all available stats: core + numeric tasks
  const allStats = useMemo(() => {
    const numericTasks = tasks.filter(t => t.type === 'number');
    const dynamicStats: StatConfig[] = numericTasks.map(t => ({
      id: `numeric-${t.id}` as StatId,
      name: t.name,
      width: 'full' as const,
      removable: true,
    }));
    return [...coreStats, ...dynamicStats];
  }, [tasks]);

  const availableStats = allStats.filter(s => !enabledStats.includes(s.id));

  // ============ Per-card drag system (matching mobile exactly) ============
  const ROW_HEIGHT = CARD_HEIGHT + CARD_GAP;
  const gridRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for pixel-based drag calculations
  useEffect(() => {
    const measure = () => {
      if (gridRef.current) {
        setContainerWidth(gridRef.current.offsetWidth);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (gridRef.current) observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, []);

  // Derived pixel values (matching mobile's HALF_CARD_WIDTH / SCREEN_MIDPOINT)
  const halfCardWidth = (containerWidth - CARD_GAP) / 2;
  const midpoint = containerWidth / 2;

  // Drag state — tracks per-card (not per-row)
  const [dragState, setDragState] = useState<{
    draggingIndex: number | null;
    offsetX: number;
    offsetY: number;
    shouldSwap: boolean;
    targetSide: 'left' | 'right' | null;
  }>({ draggingIndex: null, offsetX: 0, offsetY: 0, shouldSwap: false, targetSide: null });
  const dragStartRef = useRef({ x: 0, y: 0 });
  // Suppress all card transitions for one frame after reorder to prevent glitch
  const [isSettling, setIsSettling] = useState(false);

  // Calculate Y positions for each stat based on order and widths (matching mobile)
  const calculateStatPositions = useCallback((statsList: StatId[], configs: StatConfig[]): { yPositions: number[]; totalHeight: number } => {
    const yPositions: number[] = [];
    let currentY = 0;
    let i = 0;
    while (i < statsList.length) {
      const stat = configs.find(s => s.id === statsList[i]);
      const isHalf = stat?.width === 'half';
      if (isHalf) {
        const nextStat = statsList[i + 1] ? configs.find(s => s.id === statsList[i + 1]) : null;
        const nextIsHalf = nextStat?.width === 'half';
        yPositions.push(currentY);
        if (nextIsHalf) {
          yPositions.push(currentY);
          i += 2;
        } else {
          i += 1;
        }
        currentY += ROW_HEIGHT;
      } else {
        yPositions.push(currentY);
        currentY += ROW_HEIGHT;
        i += 1;
      }
    }
    return { yPositions, totalHeight: currentY };
  }, [ROW_HEIGHT]);

  const { yPositions, totalHeight } = useMemo(
    () => calculateStatPositions(enabledStats, allStats),
    [enabledStats, allStats, calculateStatPositions]
  );

  // Get X position and width for a stat at a given index (pixel values, matching mobile)
  const getStatLayout = useCallback((index: number, order?: StatId[], positions?: number[]): { x: number; width: number } => {
    const ord = order ?? enabledStats;
    const pos = positions ?? yPositions;
    const stat = allStats.find(s => s.id === ord[index]);
    const isHalf = stat?.width === 'half';
    if (!isHalf) return { x: 0, width: containerWidth };
    const myY = pos[index];
    let isSecondHalf = false;
    for (let i = 0; i < index; i++) {
      const otherStat = allStats.find(s => s.id === ord[i]);
      if (otherStat?.width === 'half' && pos[i] === myY) {
        isSecondHalf = true;
        break;
      }
    }
    if (isSecondHalf) {
      return { x: halfCardWidth + CARD_GAP, width: halfCardWidth };
    }
    return { x: 0, width: halfCardWidth };
  }, [enabledStats, allStats, yPositions, containerWidth, halfCardWidth]);

  // Find neighbor for half-width swap
  const getHalfWidthNeighborIndex = useCallback((index: number): number | null => {
    const stat = allStats.find(s => s.id === enabledStats[index]);
    if (stat?.width !== 'half') return null;
    const nextStat = index < enabledStats.length - 1 ? allStats.find(s => s.id === enabledStats[index + 1]) : null;
    const prevStat = index > 0 ? allStats.find(s => s.id === enabledStats[index - 1]) : null;
    if (nextStat?.width === 'half' && yPositions[index + 1] === yPositions[index]) return index + 1;
    if (prevStat?.width === 'half' && yPositions[index - 1] === yPositions[index]) return index - 1;
    return null;
  }, [enabledStats, allStats, yPositions]);

  // Calculate target index for a card being dragged (matching mobile calculateTargetIndex)
  const calculateTargetIndex = useCallback((dragIndex: number, targetRow: number, wantRightSide: boolean): number => {
    const draggedStat = allStats.find(s => s.id === enabledStats[dragIndex]);
    const isHalf = draggedStat?.width === 'half';
    const tempOrder = enabledStats.filter((_, i) => i !== dragIndex);
    const { yPositions: tempPositions } = calculateStatPositions(tempOrder, allStats);
    const rowForIndex = (idx: number): number => Math.round(tempPositions[idx] / ROW_HEIGHT);

    const statsAtTargetRow: { index: number; isHalf: boolean; isOnLeft: boolean }[] = [];
    tempOrder.forEach((statId, idx) => {
      if (rowForIndex(idx) === targetRow) {
        const stat = allStats.find(s => s.id === statId);
        const tempY = tempPositions[idx];
        let isOnLeft = true;
        for (let j = 0; j < idx; j++) {
          const otherStat = allStats.find(s => s.id === tempOrder[j]);
          if (otherStat?.width === 'half' && tempPositions[j] === tempY) { isOnLeft = false; break; }
        }
        statsAtTargetRow.push({ index: idx, isHalf: stat?.width === 'half', isOnLeft });
      }
    });

    if (statsAtTargetRow.length === 0) {
      for (let i = 0; i < tempOrder.length; i++) {
        if (rowForIndex(i) >= targetRow) return i <= dragIndex ? i : i + 1;
      }
      return tempOrder.length <= dragIndex ? tempOrder.length : tempOrder.length + 1;
    }

    const statAtRow = statsAtTargetRow[0];
    if (!isHalf) return statAtRow.index <= dragIndex ? statAtRow.index : statAtRow.index + 1;

    if (statAtRow.isHalf) {
      if (wantRightSide && statAtRow.isOnLeft) {
        const insertIdx = statAtRow.index + 1;
        return insertIdx <= dragIndex ? insertIdx : insertIdx + 1;
      } else if (!wantRightSide && !statAtRow.isOnLeft) {
        return statAtRow.index <= dragIndex ? statAtRow.index : statAtRow.index + 1;
      } else if (wantRightSide && !statAtRow.isOnLeft) {
        const leftCard = statsAtTargetRow.find(s => s.isOnLeft);
        if (leftCard) {
          const insertIdx = leftCard.index + 1;
          return insertIdx <= dragIndex ? insertIdx : insertIdx + 1;
        }
      } else {
        return statAtRow.index <= dragIndex ? statAtRow.index : statAtRow.index + 1;
      }
    }
    return statAtRow.index <= dragIndex ? statAtRow.index : statAtRow.index + 1;
  }, [enabledStats, allStats, calculateStatPositions, ROW_HEIGHT]);

  // Drag handlers
  const handleCardDragStart = useCallback((index: number, clientX: number, clientY: number) => {
    if (!isCustomizing) return;
    dragStartRef.current = { x: clientX, y: clientY };
    setDragState({ draggingIndex: index, offsetX: 0, offsetY: 0, shouldSwap: false, targetSide: null });
  }, [isCustomizing]);

  const handleCardDragMove = useCallback((clientX: number, clientY: number) => {
    if (dragState.draggingIndex === null) return;
    const index = dragState.draggingIndex;
    const offsetX = clientX - dragStartRef.current.x;
    const offsetY = clientY - dragStartRef.current.y;

    const stat = allStats.find(s => s.id === enabledStats[index]);
    const isHalf = stat?.width === 'half';
    let targetSide: 'left' | 'right' | null = null;
    let shouldSwap = false;

    if (isHalf) {
      const currentX = getStatLayout(index).x;
      // Calculate where the card's center would be (matching mobile exactly)
      const cardCenterX = currentX + halfCardWidth / 2 + offsetX;
      targetSide = cardCenterX > midpoint ? 'right' : 'left';

      // Only consider horizontal swap if vertical movement is small
      const isVerticalMovementSmall = Math.abs(offsetY) < ROW_HEIGHT * 0.5;
      const neighborIndex = getHalfWidthNeighborIndex(index);
      if (neighborIndex !== null && isVerticalMovementSmall) {
        const currentSide = currentX === 0 ? 'left' : 'right';
        shouldSwap = targetSide !== currentSide;
      }
    }

    setDragState({ draggingIndex: index, offsetX, offsetY, shouldSwap, targetSide });
  }, [dragState.draggingIndex, enabledStats, allStats, getStatLayout, getHalfWidthNeighborIndex, ROW_HEIGHT, halfCardWidth, midpoint]);

  const handleCardDragEnd = useCallback(() => {
    const { draggingIndex: index, shouldSwap, offsetX, offsetY } = dragState;
    if (index === null) return;

    const stat = allStats.find(s => s.id === enabledStats[index]);
    const isHalf = stat?.width === 'half';

    if (shouldSwap) {
      // Swap with neighbor
      setEnabledStats(prev => {
        const newStats = [...prev];
        const prevStat = index > 0 ? allStats.find(s => s.id === prev[index - 1]) : null;
        const nextStat = index < prev.length - 1 ? allStats.find(s => s.id === prev[index + 1]) : null;
        if (nextStat?.width === 'half' && yPositions[index + 1] === yPositions[index]) {
          [newStats[index], newStats[index + 1]] = [newStats[index + 1], newStats[index]];
        } else if (prevStat?.width === 'half' && yPositions[index - 1] === yPositions[index]) {
          [newStats[index], newStats[index - 1]] = [newStats[index - 1], newStats[index]];
        }
        return newStats;
      });
    } else {
      // Vertical/2D reorder
      const currentX = getStatLayout(index).x;
      const draggedCurrentY = yPositions[index];
      const draggedTargetY = draggedCurrentY + offsetY;
      const draggedTargetX = currentX + offsetX;
      let targetRow = Math.max(0, Math.round(draggedTargetY / ROW_HEIGHT));
      const wantRightSide = isHalf && draggedTargetX + halfCardWidth / 2 > midpoint;
      const targetIndex = calculateTargetIndex(index, targetRow, isHalf ? wantRightSide : false);

      if (targetIndex !== index) {
        setEnabledStats(prev => {
          const newStats = [...prev];
          const [moved] = newStats.splice(index, 1);
          const adjustedTarget = index < targetIndex ? targetIndex - 1 : targetIndex;
          newStats.splice(adjustedTarget, 0, moved);
          return newStats;
        });
      }
    }

    // Suppress all transitions for one frame to prevent "shoot" glitch
    setIsSettling(true);
    setDragState({ draggingIndex: null, offsetX: 0, offsetY: 0, shouldSwap: false, targetSide: null });
  }, [dragState, enabledStats, allStats, yPositions, calculateTargetIndex, getStatLayout, halfCardWidth, midpoint]);

  // Global mouse/touch listeners for drag
  useEffect(() => {
    if (dragState.draggingIndex === null) return;
    const onMouseMove = (e: MouseEvent) => { e.preventDefault(); handleCardDragMove(e.clientX, e.clientY); };
    const onMouseUp = () => handleCardDragEnd();
    const onTouchMove = (e: TouchEvent) => { handleCardDragMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchEnd = () => handleCardDragEnd();
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
  }, [dragState.draggingIndex, handleCardDragMove, handleCardDragEnd]);

  // Clear settling state after two frames (one to render with no transition, one to let layout settle)
  useEffect(() => {
    if (!isSettling) return;
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => {
        setIsSettling(false);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [isSettling]);

  // Calculate preview shifts for non-dragged cards
  const getPreviewShifts = useCallback((): { translateX: number; translateY: number }[] => {
    if (dragState.draggingIndex === null || dragState.shouldSwap) {
      return enabledStats.map(() => ({ translateX: 0, translateY: 0 }));
    }
    const dragIndex = dragState.draggingIndex;
    const { offsetX, offsetY } = dragState;
    const minMoveThreshold = ROW_HEIGHT * 0.4;
    if (Math.abs(offsetX) < minMoveThreshold && Math.abs(offsetY) < minMoveThreshold) {
      return enabledStats.map(() => ({ translateX: 0, translateY: 0 }));
    }
    const draggedStat = allStats.find(s => s.id === enabledStats[dragIndex]);
    const isHalf = draggedStat?.width === 'half';
    const currentX = getStatLayout(dragIndex).x;
    const draggedCurrentY = yPositions[dragIndex];
    const draggedTargetY = draggedCurrentY + offsetY;
    const draggedTargetX = currentX + offsetX;
    let targetRow = Math.max(0, Math.round(draggedTargetY / ROW_HEIGHT));
    const wantRightSide = isHalf && draggedTargetX + halfCardWidth / 2 > midpoint;
    const targetIndex = calculateTargetIndex(dragIndex, targetRow, isHalf ? wantRightSide : false);
    if (targetIndex === dragIndex) return enabledStats.map(() => ({ translateX: 0, translateY: 0 }));

    // Create hypothetical new order
    const newOrder = [...enabledStats];
    const [moved] = newOrder.splice(dragIndex, 1);
    const adjustedTarget = dragIndex < targetIndex ? targetIndex - 1 : targetIndex;
    newOrder.splice(adjustedTarget, 0, moved);
    const { yPositions: newYPositions } = calculateStatPositions(newOrder, allStats);

    // Calculate X position for a stat in the new order (matching mobile calculateXForOrder)
    const calculateXForOrder = (order: StatId[], positions: number[], idx: number): number => {
      const stat = allStats.find(s => s.id === order[idx]);
      if (stat?.width !== 'half') return 0;
      const myY = positions[idx];
      for (let i = 0; i < idx; i++) {
        const otherStat = allStats.find(s => s.id === order[i]);
        if (otherStat?.width === 'half' && positions[i] === myY) {
          return halfCardWidth + CARD_GAP;
        }
      }
      return 0;
    };

    return enabledStats.map((statId, currentIndex) => {
      if (currentIndex === dragIndex) return { translateX: 0, translateY: 0 };
      const newIndex = newOrder.indexOf(statId);
      const currentY = yPositions[currentIndex];
      const newY = newYPositions[newIndex];
      const curX = getStatLayout(currentIndex).x;
      const newX = calculateXForOrder(newOrder, newYPositions, newIndex);
      return { translateX: newX - curX, translateY: newY - currentY };
    });
  }, [dragState, enabledStats, allStats, yPositions, calculateTargetIndex, calculateStatPositions, getStatLayout, ROW_HEIGHT, halfCardWidth, midpoint]);

  const handleTimeframeChange = useCallback((tf: TimeframeType) => {
    setTimeframe(tf);
    setPeriodOffset(0);
  }, []);

  // Get date range for a timeframe with explicit offset
  const getDateRange = useCallback((tf: TimeframeType, offset?: number): { start: Date; end: Date } => {
    const effectiveOffset = offset ?? periodOffset;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (tf === 'week') {
      const currentWeekStart = calculations.getWeekStart(today);
      const offsetStart = calculations.addDays(currentWeekStart, effectiveOffset * 7);
      const offsetEnd = calculations.addDays(offsetStart, 6);
      const end = offsetEnd > today ? today : offsetEnd;
      return { start: offsetStart, end };
    } else if (tf === 'month') {
      const offsetMonth = new Date(today.getFullYear(), today.getMonth() + effectiveOffset, 1);
      const monthEnd = new Date(offsetMonth.getFullYear(), offsetMonth.getMonth() + 1, 0);
      const end = monthEnd > today ? today : monthEnd;
      return { start: offsetMonth, end };
    } else {
      const yearAgo = new Date(today);
      yearAgo.setDate(yearAgo.getDate() - 365);
      return { start: yearAgo, end: today };
    }
  }, [periodOffset]);

  // Get real data from StatsContext based on timeframe
  const getRealData = useCallback((tf: TimeframeType, offset?: number): StatsData => {
    const { start: rangeStart, end: rangeEnd } = getDateRange(tf, offset);
    const completionIdx = stats.completionIndex;

    const dailyScoresForRange = (() => {
      const scores = [];
      const d = new Date(rangeStart);
      while (d <= rangeEnd) {
        scores.push(stats.getDailyScore(d));
        d.setDate(d.getDate() + 1);
      }
      return scores;
    })();

    const daysWithTasks = dailyScoresForRange.filter(d => d.tasksScheduled > 0);
    const totalEarned = daysWithTasks.reduce((sum, d) => sum + d.pointsEarned, 0);
    const totalPossible = daysWithTasks.reduce((sum, d) => sum + d.pointsPossible, 0);
    const score = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

    const totalCompleted = daysWithTasks.reduce((sum, d) => sum + d.tasksCompleted, 0);
    const totalScheduled = daysWithTasks.reduce((sum, d) => sum + d.tasksScheduled, 0);
    const completion = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    const consistency = daysWithTasks.length > 0
      ? Math.round((daysWithTasks.filter(d => d.score >= 50).length / daysWithTasks.length) * 100)
      : 0;

    const { longestStreak: streakBest } = calculations.calculateStreak(dailyScoresForRange);
    const streakMax = tf === 'week' ? 7 : tf === 'month' ? 31 : 30;

    const trendLabel = (() => {
      if (tf === 'all') return stats.weeklyTrend;
      const prevRange = (() => {
        if (tf === 'week') {
          return { start: calculations.addDays(rangeStart, -7), end: calculations.addDays(rangeStart, -1) };
        } else {
          const prevMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 1, 1);
          const prevEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 0);
          return { start: prevMonth, end: prevEnd };
        }
      })();
      const prevScores = (() => {
        const scores = [];
        const d = new Date(prevRange.start);
        while (d <= prevRange.end) {
          scores.push(stats.getDailyScore(d));
          d.setDate(d.getDate() + 1);
        }
        return scores;
      })();
      const prevDaysWithTasks = prevScores.filter(d => d.tasksScheduled > 0);
      const prevEarned = prevDaysWithTasks.reduce((sum, d) => sum + d.pointsEarned, 0);
      const prevPossible = prevDaysWithTasks.reduce((sum, d) => sum + d.pointsPossible, 0);
      const prevScore = prevPossible > 0 ? Math.round((prevEarned / prevPossible) * 100) : 0;
      const diff = score - prevScore;
      if (diff > 5) return 'improving' as const;
      if (diff < -10) return 'declining' as const;
      return 'stable' as const;
    })();

    const perfectDayCount = dailyScoresForRange.filter(d => d.tasksScheduled > 0 && d.tasksCompleted === d.tasksScheduled).length;
    const perfectDays = {
      count: perfectDayCount,
      total: tf === 'week' ? 7 : tf === 'month' ? new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate() : 365,
    };

    const dates: Date[] = [];
    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const taskExistedOnDate = (task: Task, date: Date): boolean => {
      if (!task.createdAt) return true;
      const created = new Date(task.createdAt + 'T00:00:00');
      const check = new Date(date);
      check.setHours(0, 0, 0, 0);
      return check >= created;
    };

    const getGroupRate = (taskGroup: Task[]): number => {
      if (taskGroup.length === 0) return 0;
      let scheduled = 0;
      let completed = 0;
      for (const date of dates) {
        const dateStr = calculations.formatDate(date);
        const dayOfWeek = (date.getDay() + 6) % 7;
        for (const task of taskGroup) {
          if (task.selectedDays.includes(dayOfWeek) && taskExistedOnDate(task, date)) {
            scheduled++;
            const comp = completionIdx.get(`${task.id}:${dateStr}`);
            if ((comp as any)?.completed) completed++;
          }
        }
      }
      return scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
    };

    const completionByImportance = [
      { level: 'Medium', rate: getGroupRate(tasks.filter(t => t.importance === 'medium')) },
      { level: 'High', rate: getGroupRate(tasks.filter(t => t.importance === 'high')) },
      { level: 'Maximum', rate: getGroupRate(tasks.filter(t => t.importance === 'maximum')) },
    ];

    const completionByDifficulty = [
      { level: 'Medium', rate: getGroupRate(tasks.filter(t => t.difficulty === 'medium')) },
      { level: 'High', rate: getGroupRate(tasks.filter(t => t.difficulty === 'high')) },
      { level: 'Maximum', rate: getGroupRate(tasks.filter(t => t.difficulty === 'maximum')) },
    ];

    const taskRates: { name: string; completed: number; total: number; rate: number }[] = [];
    for (const task of tasks) {
      let scheduled = 0;
      let completed = 0;
      for (const date of dates) {
        const dayOfWeek = (date.getDay() + 6) % 7;
        if (task.selectedDays.includes(dayOfWeek) && taskExistedOnDate(task, date)) {
          scheduled++;
          const dateStr = calculations.formatDate(date);
          const comp = completionIdx.get(`${task.id}:${dateStr}`);
          if ((comp as any)?.completed) completed++;
        }
      }
      if (scheduled > 0) {
        taskRates.push({ name: task.name, completed, total: scheduled, rate: completed / scheduled });
      }
    }
    taskRates.sort((a, b) => b.rate - a.rate);

    const topTask = taskRates.length > 0
      ? { name: taskRates[0].name, completed: taskRates[0].completed, total: taskRates[0].total }
      : { name: '', completed: 0, total: 0 };
    const bottomTask = taskRates.length > 0
      ? { name: taskRates[taskRates.length - 1].name, completed: taskRates[taskRates.length - 1].completed, total: taskRates[taskRates.length - 1].total }
      : { name: '', completed: 0, total: 0 };

    let bestScore = 0;
    for (const ds of dailyScoresForRange) {
      if (ds.tasksScheduled > 0 && ds.score > bestScore) bestScore = ds.score;
    }

    return {
      score: Math.round(score),
      completion: Math.round(completion),
      consistency: Math.round(consistency),
      streak: { best: streakBest, max: streakMax },
      trend: trendLabel as 'improving' | 'stable' | 'declining',
      trendSubtext: tf === 'week' ? 'vs Last Week' : tf === 'month' ? 'vs Last Month' : 'Overall Trajectory',
      completionByImportance,
      completionByDifficulty,
      perfectDays,
      bestScore,
      bestScoreSubtext: tf === 'week' ? 'This Week' : tf === 'month' ? 'This Month' : 'All-Time',
      topTask,
      bottomTask,
    };
  }, [stats, tasks, getDateRange]);

  const formatPeriod = (offset?: number) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (timeframe === 'week') {
      const { start: weekStart } = getDateRange('week', offset);
      const weekEnd = calculations.addDays(weekStart, 6);
      const startMonth = shortMonths[weekStart.getMonth()];
      const endMonth = shortMonths[weekEnd.getMonth()];
      const startDay = weekStart.getDate();
      const endDay = weekEnd.getDate();
      const year = weekEnd.getFullYear();
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${startMonth} ${startDay} \u2013 ${endDay}, ${year}`;
      }
      return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}, ${year}`;
    }
    if (timeframe === 'month') {
      const { start: monthStart } = getDateRange('month', offset);
      return `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`;
    }
    return 'All Time';
  };

  const removeStat = (id: StatId) => {
    const stat = allStats.find(s => s.id === id);
    if (stat && !stat.removable) return;
    setEnabledStats(prev => prev.filter(s => s !== id));
  };

  const addStat = (id: StatId) => {
    setEnabledStats(prev => [...prev, id]);
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (timeframe === 'all') return;
    if (direction === 'next' && periodOffset >= 0) return;
    setPeriodOffset(prev => prev + (direction === 'prev' ? -1 : 1));
  };

  // Swipe key for SwipeableView
  const swipeKey = `${timeframe}-${periodOffset}`;
  const hasNextPeriod = timeframe !== 'all' && periodOffset < 0;
  const hasPrevPeriod = timeframe !== 'all';

  // Render stat component by id
  const renderStatComponent = (statId: StatId, data: StatsData) => {
    const numericMatch = statId.match(/^numeric-(\d+)$/);
    if (numericMatch) {
      const taskId = parseInt(numericMatch[1]);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return null;
      return <NumericTaskChart task={task} timeframe={timeframe} periodOffset={periodOffset} />;
    }
    switch (statId) {
      case 'main-rings': return <MainRingsCard data={data} />;
      case 'trend': return <TrendCard data={data} />;
      case 'streak': return <StreakCard timeframe={timeframe} data={data} />;
      case 'importance': return <TaskImportanceCard data={data} />;
      case 'difficulty': return <TaskDifficultyCard data={data} />;
      case 'perfect-days': return <PerfectDaysCard data={data} />;
      case 'best-score': return <BestScoreCard data={data} />;
      case 'top-task': return <TopTaskCard data={data} />;
      case 'bottom-task': return <BottomTaskCard data={data} />;
      default: return null;
    }
  };

  // Render stats in NORMAL mode (non-edit) — standard grid layout
  const renderNormalGrid = (data: StatsData) => {
    const rows: React.ReactElement[] = [];
    let i = 0;
    while (i < enabledStats.length) {
      const statId = enabledStats[i];
      const stat = allStats.find(s => s.id === statId);
      if (!stat) { i++; continue; }
      const isHalf = stat.width === 'half';
      if (isHalf) {
        const nextStatId = enabledStats[i + 1];
        const nextStat = nextStatId ? allStats.find(s => s.id === nextStatId) : null;
        const nextIsHalf = nextStat?.width === 'half';
        if (nextIsHalf) {
          rows.push(
            <div key={`row-${i}`} style={{ ...styles.halfCardRow, marginBottom: CARD_GAP }}>
              {renderStatComponent(statId, data)}
              {renderStatComponent(nextStatId, data)}
            </div>
          );
          i += 2;
        } else {
          rows.push(
            <div key={`row-${i}`} style={{ ...styles.halfCardRow, marginBottom: CARD_GAP }}>
              {renderStatComponent(statId, data)}
              <div style={{ flex: 1 }} />
            </div>
          );
          i += 1;
        }
      } else {
        rows.push(
          <div key={`row-${i}`} style={{ marginBottom: CARD_GAP }}>
            {renderStatComponent(statId, data)}
          </div>
        );
        i += 1;
      }
    }
    return rows;
  };

  // Render stats in EDIT mode — absolute positioned per-card, each individually draggable
  const renderEditGrid = (data: StatsData) => {
    const previewShifts = getPreviewShifts();
    const neighborToPreview = dragState.draggingIndex !== null && dragState.shouldSwap
      ? getHalfWidthNeighborIndex(dragState.draggingIndex)
      : null;

    return (
      <div style={{ height: totalHeight, position: 'relative' }}>
        {enabledStats.map((statId, index) => {
          const stat = allStats.find(s => s.id === statId);
          if (!stat) return null;

          const isHalf = stat.width === 'half';
          const layout = getStatLayout(index);
          const isOnLeft = layout.x === 0;
          const isDragging = index === dragState.draggingIndex;
          const showSwapPreview = index === neighborToPreview;
          const { translateX: previewTX, translateY: previewTY } = previewShifts[index];

          // Compute transform
          let transformStr = '';
          if (isDragging) {
            transformStr = `translate(${dragState.offsetX}px, ${dragState.offsetY}px) scale(1.03)`;
          } else if (showSwapPreview && isHalf) {
            // Horizontal swap preview: shift by exactly halfCardWidth + gap (matching mobile)
            const shiftPx = isOnLeft ? (halfCardWidth + CARD_GAP) : -(halfCardWidth + CARD_GAP);
            transformStr = `translate(${shiftPx}px, 0px)`;
          } else if (previewTX !== 0 || previewTY !== 0) {
            // Preview shifts are in pixels from getPreviewShifts
            transformStr = `translate(${previewTX}px, ${previewTY}px)`;
          }

          const cardStyle: React.CSSProperties = {
            position: 'absolute',
            top: yPositions[index],
            left: isHalf ? (isOnLeft ? 0 : `calc(50% + ${CARD_GAP / 2}px)`) : 0,
            width: isHalf ? `calc(50% - ${CARD_GAP / 2}px)` : '100%',
            height: CARD_HEIGHT,
            zIndex: isDragging ? 100 : 1,
            transform: transformStr || undefined,
            transition: (isDragging || isSettling) ? 'none' : 'transform 200ms ease',
            cursor: 'grab',
            userSelect: 'none',
          };

          return (
            <div
              key={statId}
              style={cardStyle}
              onMouseDown={(e) => { e.preventDefault(); handleCardDragStart(index, e.clientX, e.clientY); }}
              onTouchStart={(e) => handleCardDragStart(index, e.touches[0].clientX, e.touches[0].clientY)}
            >
              {/* Jiggle wrapper */}
              <div style={{
                animation: 'statsShake 240ms ease-in-out infinite alternate',
                height: '100%',
                position: 'relative',
              }}>
                {renderStatComponent(statId, data)}
                {stat.removable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeStat(statId); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={styles.removeButton}
                  >
                    <span style={styles.removeButtonText}>&times;</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Build swipeable period content
  const renderPeriodContent = (offset: number, periodLabel: string, interactive: boolean) => {
    const isNextDisabled = offset >= 0;
    return (
    <div style={styles.scrollContent}>
      {/* Period Navigation */}
      {timeframe !== 'all' && (
        <div style={styles.periodNav}>
          <button style={styles.navArrow} onClick={interactive ? () => navigatePeriod('prev') : undefined}>
            <span style={styles.navArrowText}>{'\u2039'}</span>
          </button>
          <span style={styles.periodText}>{periodLabel}</span>
          <button
            style={styles.navArrow}
            onClick={interactive ? () => navigatePeriod('next') : undefined}
            disabled={isNextDisabled}
          >
            <span style={{
              ...styles.navArrowText,
              ...(isNextDisabled ? styles.navArrowDisabled : {}),
            }}>{'\u203A'}</span>
          </button>
        </div>
      )}

      {/* Stats */}
      <div ref={interactive ? gridRef : undefined}>
        {interactive && isCustomizing
          ? renderEditGrid(getRealData(timeframe, offset))
          : renderNormalGrid(getRealData(timeframe, offset))}
      </div>

      {/* Available Stats + Customize (only on interactive panel) */}
      {interactive && isCustomizing && availableStats.length > 0 && (
        <div style={styles.availableSection}>
          <span style={styles.availableTitle}>AVAILABLE STATS</span>
          {availableStats.map((stat) => (
            <button key={stat.id} style={styles.availableItem} onClick={() => addStat(stat.id)}>
              <span style={styles.availableItemText}>{stat.name}</span>
              <span style={styles.availableItemHint}>Tap to add</span>
            </button>
          ))}
        </div>
      )}

      {interactive && (
        <button style={styles.customizeButton} onClick={() => {
          if (isCustomizing) {
            setDragState({ draggingIndex: null, offsetX: 0, offsetY: 0, shouldSwap: false, targetSide: null });
          }
          setIsCustomizing(!isCustomizing);
        }}>
          <span style={isCustomizing ? styles.doneButtonText : styles.customizeText}>
            {isCustomizing ? 'Done' : 'Customize'}
          </span>
        </button>
      )}
    </div>
  );
  };

  return (
    <div style={{ ...styles.container, display: 'flex', flexDirection: 'column' }}>
      {/* Timeframe Selector (fixed, not swiped) */}
      <div style={{ padding: `0 ${HORIZONTAL_PADDING}px`, paddingTop: HORIZONTAL_PADDING, flexShrink: 0 }}>
        <div style={styles.timeframeSelector}>
          {(['week', 'month', 'all'] as TimeframeType[]).map((tf) => (
            <button
              key={tf}
              style={{
                ...styles.timeframeButton,
                ...(timeframe === tf ? styles.timeframeButtonActive : {}),
              }}
              onClick={() => handleTimeframeChange(tf)}
            >
              <span style={{
                ...styles.timeframeText,
                ...(timeframe === tf ? styles.timeframeTextActive : {}),
              }}>
                {tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : 'All Time'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Swipeable content */}
      <SwipeableView
        prevContent={hasPrevPeriod ? renderPeriodContent(periodOffset - 1, formatPeriod(periodOffset - 1), false) : undefined}
        nextContent={hasNextPeriod ? renderPeriodContent(periodOffset + 1, formatPeriod(periodOffset + 1), false) : undefined}
        onSwipePrev={() => navigatePeriod('prev')}
        onSwipeNext={() => navigatePeriod('next')}
        swipeKey={swipeKey}
        disabled={isCustomizing}
      >
        {renderPeriodContent(periodOffset, formatPeriod(), true)}
      </SwipeableView>
    </div>
  );
}

// ========================================
// STYLES (matching mobile exactly)
// ========================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 16,
  },
  timeframeSelector: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 4,
  },
  timeframeButton: {
    flex: 1,
    padding: '12px 0',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  timeframeButtonActive: {
    backgroundColor: '#1A1A1A',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: 500,
    color: '#6B6B6B',
  },
  timeframeTextActive: {
    fontWeight: 600,
    color: '#FFFFFF',
  },
  periodNav: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 0,
    marginBottom: 16,
  },
  navArrow: {
    padding: 8,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  navArrowText: {
    fontSize: 18,
    color: '#6B6B6B',
  },
  navArrowDisabled: {
    color: '#333333',
  },
  periodText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  // Full-width stat card
  statCard: {
    height: CARD_HEIGHT,
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 16,
    border: '1px solid #1A1A1A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Chart card
  chartCard: {
    height: CARD_HEIGHT,
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 36,
    paddingBottom: 12,
    border: '1px solid #1A1A1A',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  // Half-width card
  halfCard: {
    flex: 1,
    height: CARD_HEIGHT,
    backgroundColor: '#0D0D0D',
    borderRadius: 16,
    border: '1px solid #1A1A1A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halfCardRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  // Card title (positioned absolute top center)
  cardTitle: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    fontSize: 11,
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  // Three rings row
  threeRingsRow: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
  },
  ringSlot: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom subtexts row
  cardSubtextRow: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    display: 'flex',
    flexDirection: 'row',
  },
  cardSubtext: {
    flex: 1,
    fontSize: 11,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  // Half card labels (positioned absolute)
  halfCardLabel: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    fontSize: 11,
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  halfCardSubtext: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    fontSize: 11,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  halfCardSubtextStatic: {
    fontSize: 11,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  // Trend pill
  trendPill: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 90,
    height: 44,
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: 22,
    border: '1px solid',
  },
  // Chart styles
  chartContainer: {
    display: 'flex',
    flexDirection: 'row',
  },
  yAxis: {
    width: 30,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  xAxis: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  axisLabel: {
    fontSize: 10,
    color: '#6B6B6B',
  },
  // Remove button (customize mode)
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    zIndex: 10,
    padding: 0,
  },
  removeButtonText: {
    color: '#404040',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '16px',
  },
  // Available stats section
  availableSection: {
    marginTop: 16,
  },
  availableTitle: {
    fontSize: 12,
    color: '#404040',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    display: 'block',
  },
  availableItem: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  availableItemText: {
    fontSize: 15,
    fontWeight: 500,
    color: '#A1A1A1',
  },
  availableItemHint: {
    fontSize: 11,
    color: '#404040',
  },
  // Customize button
  customizeButton: {
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    padding: 12,
    border: '1px solid #1A1A1A',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    width: '100%',
    marginTop: CARD_GAP,
  },
  customizeText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#FFFFFF',
  },
};
