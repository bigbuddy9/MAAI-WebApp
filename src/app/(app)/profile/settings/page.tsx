'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const colors = {
  background: '#0A0A0A',
  card: '#0D0D0D',
  border: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textMuted: '#6B6B6B',
  borderSubtle: '#333333',
  cyan: '#00FFFF',
};

function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onValueChange(!value)}
      style={{
        width: 51,
        height: 31,
        backgroundColor: value ? colors.cyan : colors.border,
        borderRadius: 16,
        padding: 2,
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 27,
        height: 27,
        backgroundColor: colors.textPrimary,
        borderRadius: 14,
        transform: value ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s ease',
      }} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [weekStartsMonday, setWeekStartsMonday] = useState(true);

  // Notification preferences (web doesn't have push notifications,
  // but we keep the UI consistent with mobile for future PWA support)
  const [prefs, setPrefs] = useState({
    threeMissEnabled: true,
    streakWarningEnabled: true,
    goalCheckpointsEnabled: true,
    goalDeadlineEnabled: true,
    milestoneDueEnabled: true,
    weeklyReportEnabled: true,
    monthlyReportEnabled: true,
  });

  const updatePref = (key: string, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const handleExportData = () => {
    alert('Your data export will be prepared and sent to your email.');
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      // TODO: Clear all data
    }
  };

  return (
    <div style={s.container}>
      <button onClick={() => router.back()} style={s.backBtn}>
        <span style={s.backBtnText}>{'\u2039'}</span>
      </button>

      <h1 style={s.pageTitle}>Settings</h1>

      <span style={s.sectionTitle}>Notifications</span>
      <p style={s.helperText}>Choose which notifications you&apos;d like to receive.</p>
      <div style={s.settingsCard}>
        <div style={s.settingsRow}>
          <div style={s.settingsLabelGroup}>
            <span style={s.settingsLabel}>Three-Miss Warnings</span>
            <span style={s.settingsDesc}>When a task is skipped 3 times in a row</span>
          </div>
          <Toggle value={prefs.threeMissEnabled} onValueChange={(v) => updatePref('threeMissEnabled', v)} />
        </div>
        <div style={s.settingsRow}>
          <div style={s.settingsLabelGroup}>
            <span style={s.settingsLabel}>Streak Warnings</span>
            <span style={s.settingsDesc}>When your streak is at risk</span>
          </div>
          <Toggle value={prefs.streakWarningEnabled} onValueChange={(v) => updatePref('streakWarningEnabled', v)} />
        </div>
        <div style={s.settingsRow}>
          <div style={s.settingsLabelGroup}>
            <span style={s.settingsLabel}>Goal Checkpoints</span>
            <span style={s.settingsDesc}>At 50%, 75%, and 90% of goal timeline</span>
          </div>
          <Toggle value={prefs.goalCheckpointsEnabled} onValueChange={(v) => updatePref('goalCheckpointsEnabled', v)} />
        </div>
        <div style={s.settingsRow}>
          <div style={s.settingsLabelGroup}>
            <span style={s.settingsLabel}>Goal Deadlines</span>
            <span style={s.settingsDesc}>On your goal&apos;s target date</span>
          </div>
          <Toggle value={prefs.goalDeadlineEnabled} onValueChange={(v) => updatePref('goalDeadlineEnabled', v)} />
        </div>
        <div style={s.settingsRow}>
          <div style={s.settingsLabelGroup}>
            <span style={s.settingsLabel}>Milestone Reminders</span>
            <span style={s.settingsDesc}>When a milestone is due</span>
          </div>
          <Toggle value={prefs.milestoneDueEnabled} onValueChange={(v) => updatePref('milestoneDueEnabled', v)} />
        </div>
        <div style={s.settingsRow}>
          <div style={s.settingsLabelGroup}>
            <span style={s.settingsLabel}>Weekly Reports</span>
            <span style={s.settingsDesc}>Every Monday morning</span>
          </div>
          <Toggle value={prefs.weeklyReportEnabled} onValueChange={(v) => updatePref('weeklyReportEnabled', v)} />
        </div>
        <div style={{ ...s.settingsRow, borderBottom: 'none' }}>
          <div style={s.settingsLabelGroup}>
            <span style={s.settingsLabel}>Monthly Reports</span>
            <span style={s.settingsDesc}>First of every month</span>
          </div>
          <Toggle value={prefs.monthlyReportEnabled} onValueChange={(v) => updatePref('monthlyReportEnabled', v)} />
        </div>
      </div>

      <span style={{ ...s.sectionTitle, marginTop: 32 }}>Preferences</span>
      <div style={s.settingsCard}>
        <div style={{ ...s.settingsRow, borderBottom: 'none' }}>
          <span style={s.settingsLabel}>Week Starts Monday</span>
          <Toggle value={weekStartsMonday} onValueChange={setWeekStartsMonday} />
        </div>
      </div>

      <span style={{ ...s.sectionTitle, marginTop: 32 }}>Data</span>
      <div style={s.settingsCard}>
        <button style={s.settingsRowBtn} onClick={handleExportData}>
          <span style={s.settingsLabel}>Export Data</span>
          <span style={s.settingsArrow}>{'\u203A'}</span>
        </button>
        <button style={{ ...s.settingsRowBtn, borderBottom: 'none' }} onClick={handleClearData}>
          <span style={s.settingsLabel}>Clear All Data</span>
          <span style={s.settingsArrow}>{'\u203A'}</span>
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    paddingBottom: 100,
    overflowY: 'auto',
    height: '100%',
  },
  backBtn: {
    marginBottom: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  backBtnText: {
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: 300,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: 32,
    marginTop: 0,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
    marginBottom: 12,
    display: 'block',
  },
  helperText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: '21px',
    marginTop: 0,
  },
  settingsCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    borderBottom: `1px solid ${colors.border}`,
    gap: 16,
  },
  settingsRowBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: `1px solid ${colors.border}`,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  settingsLabelGroup: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: 500,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    display: 'block',
  },
  settingsDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    display: 'block',
  },
  settingsArrow: {
    fontSize: 18,
    color: colors.borderSubtle,
    fontWeight: 300,
  },
};
