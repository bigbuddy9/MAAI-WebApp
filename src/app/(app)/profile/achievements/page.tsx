'use client';

import { useRouter } from 'next/navigation';
import { useAchievements } from '@/contexts/AchievementContext';
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  AchievementCategory,
} from '@/utils/achievementDefinitions';

const colors = {
  background: '#0A0A0A',
  card: '#0D0D0D',
  border: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textMuted: '#6B6B6B',
  textFaint: '#404040',
  borderSubtle: '#333333',
};

export default function AchievementsPage() {
  const router = useRouter();
  const { unlockedAchievements, totalUnlocked, totalAchievements, isLoading } = useAchievements();

  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));
  const unlockedMap = new Map(unlockedAchievements.map(a => [a.achievementId, a]));

  const categories: AchievementCategory[] = ['tasks', 'perfect_days', 'goals'];

  return (
    <div style={s.container}>
      <button onClick={() => router.back()} style={s.backBtn}>
        <span style={s.backBtnText}>{'\u2039'}</span>
      </button>

      <h1 style={s.pageTitle}>Achievements</h1>

      <p style={s.subtitle}>
        {totalUnlocked} of {totalAchievements} unlocked
      </p>

      {isLoading ? (
        <p style={{ color: colors.textMuted, fontSize: 14 }}>Loading...</p>
      ) : (
        categories.map(category => {
          const categoryAchievements = ACHIEVEMENTS.filter(a => a.category === category);
          if (categoryAchievements.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: 32 }}>
              <span style={s.sectionTitle}>{CATEGORY_LABELS[category]}</span>
              <div style={s.settingsCard}>
                {categoryAchievements.map((achievement, i) => {
                  const isUnlocked = unlockedIds.has(achievement.id);
                  const unlockData = unlockedMap.get(achievement.id);
                  const isLast = i === categoryAchievements.length - 1;

                  return (
                    <div
                      key={achievement.id}
                      style={{
                        ...s.achievementRow,
                        ...(isLast ? { borderBottom: 'none' } : {}),
                        opacity: isUnlocked ? 1 : 0.4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                        <span style={{ fontSize: 22 }}>{achievement.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 15,
                            fontWeight: 500,
                            color: isUnlocked ? colors.textPrimary : colors.textFaint,
                            letterSpacing: -0.2,
                          }}>
                            {achievement.description}
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: isUnlocked ? colors.textMuted : colors.textFaint,
                            marginTop: 2,
                          }}>
                            {isUnlocked && unlockData
                              ? `Unlocked ${unlockData.unlockedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                              : achievement.socialProof
                            }
                          </div>
                        </div>
                      </div>
                      {isUnlocked && (
                        <span style={{ fontSize: 14, color: '#00FFFF' }}>&#10003;</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
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
    marginBottom: 8,
    marginTop: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 32,
    marginTop: 0,
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
  settingsCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    overflow: 'hidden',
  },
  achievementRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border}`,
  },
};
