'use client';

import { useState, useMemo } from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useTasks } from '@/contexts/TaskContext';
import * as calculations from '@/shared';
import { getTierByPercentage, colors, spacing, borderRadius } from '@/shared';

type ReportType = 'daily' | 'weekly' | 'monthly';

interface Report {
  id: string;
  type: ReportType;
  period: string;
  meta: string;
  score: number;
  completion: number;
  consistency: number;
  month: string;
  year: number;
}

interface ReportsListViewProps {
  onNavigateToReport?: (reportId: string) => void;
}

export default function ReportsListView({ onNavigateToReport }: ReportsListViewProps) {
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const stats = useStats();
  const { tasks } = useTasks();

  const calcTasks = useMemo((): calculations.Task[] => {
    return tasks.map(t => ({ ...t, goalPriority: t.goalPriority ?? 99 }));
  }, [tasks]);

  const userStartDate = useMemo((): Date | null => {
    const dates: Date[] = [];
    tasks.forEach(t => {
      if (t.createdAt) dates.push(new Date(t.createdAt + 'T00:00:00'));
    });
    stats.completions.forEach(c => {
      dates.push(new Date(c.date + 'T00:00:00'));
    });
    if (dates.length === 0) return null;
    return dates.reduce((earliest, d) => d < earliest ? d : earliest, dates[0]);
  }, [tasks, stats.completions]);

  const dailyReports = useMemo((): Report[] => {
    if (!userStartDate || stats.completions.length === 0) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reports: Report[] = [];
    const datesWithCompletions = new Set(stats.completions.map(c => c.date));
    let current = calculations.addDays(today, -1);
    let dayCount = 0;
    while (current >= userStartDate && dayCount < 90) {
      const dateStr = calculations.formatDate(current);
      if (datesWithCompletions.has(dateStr)) {
        const dailyScore = calculations.calculateDailyScore(calcTasks, stats.completions, current, stats.completionIndex);
        if (dailyScore.tasksScheduled > 0) {
          const completionPct = Math.round((dailyScore.tasksCompleted / dailyScore.tasksScheduled) * 100);
          const dayLabel = current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const monthName = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          reports.push({
            id: `d-${dateStr}`,
            type: 'daily',
            period: `D${reports.length + 1}`,
            meta: dayLabel,
            score: dailyScore.score,
            completion: completionPct,
            consistency: dailyScore.score >= 50 ? 100 : 0,
            month: monthName,
            year: current.getFullYear(),
          });
        }
      }
      current = calculations.addDays(current, -1);
      dayCount++;
    }
    const total = reports.length;
    reports.forEach((r, i) => { r.period = `D${total - i}`; });
    return reports;
  }, [calcTasks, stats.completions, stats.completionIndex, userStartDate]);

  const weeklyReports = useMemo((): Report[] => {
    if (!userStartDate || stats.completions.length === 0) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentWeekStart = calculations.getWeekStart(today);
    const reports: Report[] = [];
    const datesWithCompletions = new Set(stats.completions.map(c => c.date));
    let weekStart = calculations.addDays(currentWeekStart, -7);
    let weekCount = 0;
    while (weekStart >= userStartDate && weekCount < 52) {
      const weekEnd = calculations.addDays(weekStart, 6);
      let hasCompletions = false;
      for (let i = 0; i <= 6; i++) {
        if (datesWithCompletions.has(calculations.formatDate(calculations.addDays(weekStart, i)))) {
          hasCompletions = true;
          break;
        }
      }
      if (hasCompletions) {
        const dailyScores = calculations.calculateDailyScoresForRange(calcTasks, stats.completions, weekStart, weekEnd, stats.completionIndex);
        const daysWithTasks = dailyScores.filter(d => d.tasksScheduled > 0);
        if (daysWithTasks.length > 0) {
          const score = calculations.calculatePeriodScore(dailyScores);
          const completion = calculations.calculateCompletion(dailyScores);
          const consistency = calculations.calculateConsistency(dailyScores);
          const monthName = weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          reports.push({
            id: `w-${calculations.formatDate(weekStart)}`,
            type: 'weekly',
            period: `W${reports.length + 1}`,
            meta: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            score,
            completion,
            consistency,
            month: monthName,
            year: weekStart.getFullYear(),
          });
        }
      }
      weekStart = calculations.addDays(weekStart, -7);
      weekCount++;
    }
    const total = reports.length;
    reports.forEach((r, i) => { r.period = `W${total - i}`; });
    return reports;
  }, [calcTasks, stats.completions, stats.completionIndex, userStartDate]);

  const monthlyReports = useMemo((): Report[] => {
    if (!userStartDate || stats.completions.length === 0) return [];
    const today = new Date();
    const reports: Report[] = [];
    const monthsWithCompletions = new Set(
      stats.completions.map(c => {
        const [y, m] = c.date.split('-');
        return `${y}-${m}`;
      })
    );
    let year = today.getFullYear();
    let month = today.getMonth() - 1;
    if (month < 0) { month = 11; year--; }
    let monthCount = 0;
    while (monthCount < 24) {
      const monthStart = new Date(year, month, 1);
      if (monthStart < userStartDate) break;
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      if (monthsWithCompletions.has(monthKey)) {
        const monthEnd = new Date(year, month + 1, 0);
        const dailyScores = calculations.calculateDailyScoresForRange(calcTasks, stats.completions, monthStart, monthEnd, stats.completionIndex);
        const daysWithTasks = dailyScores.filter(d => d.tasksScheduled > 0);
        if (daysWithTasks.length > 0) {
          const score = calculations.calculatePeriodScore(dailyScores);
          const completion = calculations.calculateCompletion(dailyScores);
          const consistency = calculations.calculateConsistency(dailyScores);
          const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short' });
          reports.push({
            id: `m-${year}-${String(month + 1).padStart(2, '0')}`,
            type: 'monthly',
            period: `M${reports.length + 1}`,
            meta: monthLabel,
            score,
            completion,
            consistency,
            month: String(year),
            year,
          });
        }
      }
      month--;
      if (month < 0) { month = 11; year--; }
      monthCount++;
    }
    const total = reports.length;
    reports.forEach((r, i) => { r.period = `M${total - i}`; });
    return reports;
  }, [calcTasks, stats.completions, stats.completionIndex, userStartDate]);

  const getReports = () => {
    switch (reportType) {
      case 'daily': return dailyReports;
      case 'weekly': return weeklyReports;
      case 'monthly': return monthlyReports;
    }
  };

  const groupReportsBySection = (reports: Report[]) => {
    const groups: { [key: string]: Report[] } = {};
    reports.forEach(report => {
      const key = report.month;
      if (!groups[key]) groups[key] = [];
      groups[key].push(report);
    });
    return groups;
  };

  const renderMiniRing = (percent: number, size: number = 36) => {
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    const tier = getTierByPercentage(percent);

    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1A1A1A"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tier.main}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const handleReportPress = (report: Report) => {
    onNavigateToReport?.(report.id);
  };

  const getNextReportInfo = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = calculations.addDays(today, 1);
    const currentWeekStart = calculations.getWeekStart(today);
    const nextMonday = calculations.addDays(currentWeekStart, 7);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    return {
      daily: tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      weekly: nextMonday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      monthly: nextMonthStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    };
  };

  const reports = getReports();
  const groupedReports = groupReportsBySection(reports);
  const hasReports = reports.length > 0;

  return (
    <div style={s.container}>
      <div style={s.scrollContent}>
        {/* Timeframe Selector */}
        <div style={s.timeframeSelector}>
          {(['daily', 'weekly', 'monthly'] as ReportType[]).map((type) => (
            <button
              key={type}
              style={{
                ...s.timeframeButton,
                ...(reportType === type ? s.timeframeButtonActive : {}),
              }}
              onClick={() => setReportType(type)}
            >
              <span
                style={{
                  ...s.timeframeText,
                  ...(reportType === type ? s.timeframeTextActive : {}),
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {!hasReports && (() => {
          const info = getNextReportInfo();
          const typeLabel = reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : 'Monthly';
          const nextDate = reportType === 'daily' ? info.daily : reportType === 'weekly' ? info.weekly : info.monthly;
          return (
            <div style={s.emptyState}>
              <p style={s.emptySubtitle}>
                {typeLabel} reports with detailed performance metrics will generate at the end of each {reportType === 'daily' ? 'day' : reportType === 'weekly' ? 'week' : 'month'} for review.
              </p>
              <div style={s.firstReportButton}>
                <span style={s.firstReportLabel}>First report</span>
                <span style={s.firstReportDate}>{nextDate}</span>
              </div>
            </div>
          );
        })()}

        {/* Report List */}
        {hasReports && Object.entries(groupedReports)
          .sort((a, b) => {
            const aYear = a[1][0]?.year || 0;
            const bYear = b[1][0]?.year || 0;
            if (aYear !== bYear) return bYear - aYear;
            return 0;
          })
          .map(([section, sectionReports]) => (
          <div key={section}>
            <div style={s.sectionLabel}>{section}</div>
            {sectionReports.map((report) => {
              const scoreTier = getTierByPercentage(report.score);
              return (
                <button
                  key={report.id}
                  style={s.reportCard}
                  onClick={() => handleReportPress(report)}
                >
                  {/* Score Indicator Bar */}
                  <div style={{ ...s.scoreIndicator, backgroundColor: scoreTier.main }} />

                  {/* Report Info */}
                  <div style={s.reportInfo}>
                    <div style={s.reportPeriod}>{report.period}</div>
                    <div style={s.reportMeta}>{report.meta}</div>
                  </div>

                  {/* Mini Rings */}
                  <div style={s.reportRings}>
                    {renderMiniRing(report.score)}
                    {renderMiniRing(report.completion)}
                    {renderMiniRing(report.consistency)}
                  </div>

                  {/* Arrow */}
                  <span style={s.arrowIcon}>&rsaquo;</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 16,
  },
  timeframeSelector: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.xl,
  },
  timeframeButton: {
    flex: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  timeframeButtonActive: {
    backgroundColor: colors.border,
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textMuted,
  },
  timeframeTextActive: {
    color: colors.textPrimary,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: '22px',
    paddingLeft: 20,
    paddingRight: 20,
    margin: 0,
    marginBottom: 24,
  },
  firstReportButton: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 16,
    paddingRight: 16,
    width: '100%',
  },
  firstReportLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  firstReportDate: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 24,
  },
  reportCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left',
  },
  scoreIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 14,
    flexShrink: 0,
  },
  reportInfo: {
    flex: 1,
  },
  reportPeriod: {
    fontSize: 17,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  reportMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  reportRings: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
  },
  arrowIcon: {
    fontSize: 20,
    color: colors.borderSubtle,
    marginLeft: 14,
  },
};
