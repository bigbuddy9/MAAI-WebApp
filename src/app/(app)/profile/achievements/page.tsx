'use client';

import { useAchievements } from '@/contexts/AchievementContext';
import { ACHIEVEMENTS } from '@/utils/achievementDefinitions';
import ProfileSubPageWrapper from '@/components/layout/ProfileSubPageWrapper';

const colors = {
  background: '#0A0A0A',
  card: '#0D0D0D',
  border: '#1A1A1A',
  borderLocked: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textMuted: '#6B6B6B',
  textLocked: '#3A3A3A',
};

export default function AchievementsPage() {
  const { unlockedAchievements, totalUnlocked, totalAchievements, isLoading } = useAchievements();

  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));
  const unlockedMap = new Map(unlockedAchievements.map(a => [a.achievementId, a]));

  // Sort: unlocked first, then locked
  const sortedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id);
    const bUnlocked = unlockedIds.has(b.id);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return 0;
  });

  return (
    <ProfileSubPageWrapper>
      <h1 style={s.pageTitle}>Achievements</h1>

      <p style={s.subtitle}>
        {totalUnlocked} of {totalAchievements} unlocked
      </p>

      {isLoading ? (
        <p style={{ color: colors.textMuted, fontSize: 14 }}>Loading...</p>
      ) : (
        <div style={s.achievementsList}>
          {sortedAchievements.map(achievement => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const unlockData = unlockedMap.get(achievement.id);

            return isUnlocked ? (
              <div key={achievement.id} className="achievement-card-unlocked" style={s.cardOuter}>
                <div className="spinner" style={s.spinner} />
                <div className="glow" style={s.glow}>
                  <div className="glow-inner" style={s.glowInner} />
                </div>
                <div style={s.cardInner}>
                  <div style={s.gradientFill} />
                  <div style={s.cardContent}>
                    <div style={s.achievementName}>{achievement.description}</div>
                    {unlockData && (
                      <div style={s.unlockDate}>
                        Achieved on {unlockData.unlockedAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div key={achievement.id} style={s.cardLocked}>
                <div style={s.achievementNameLocked}>{achievement.description}</div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .achievement-card-unlocked .spinner {
          animation: spin 3.5s linear infinite;
        }
        .achievement-card-unlocked .glow-inner {
          animation: spin 3.5s linear infinite;
        }
      `}</style>
    </ProfileSubPageWrapper>
  );
}

const s: Record<string, React.CSSProperties> = {
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
  achievementsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  // Unlocked card - gradient border
  cardOuter: {
    position: 'relative',
    borderRadius: 14,
    padding: 1.5,
    overflow: 'hidden',
    width: '100%',
  },
  spinner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '150%',
    paddingBottom: '150%',
    transform: 'translate(-50%, -50%)',
    background: 'conic-gradient(from 0deg, #A78BFA, #6366F1, #2563EB, #38BDF8, #00FFFF, #38BDF8, #2563EB, #6366F1, #A78BFA)',
    borderRadius: '50%',
    zIndex: 0,
  },
  glow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 17,
    overflow: 'hidden',
    opacity: 0.12,
    filter: 'blur(12px)',
    zIndex: -1,
    pointerEvents: 'none',
  },
  glowInner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '150%',
    paddingBottom: '150%',
    transform: 'translate(-50%, -50%)',
    background: 'conic-gradient(from 0deg, #A78BFA, #6366F1, #2563EB, #38BDF8, #00FFFF, #38BDF8, #2563EB, #6366F1, #A78BFA)',
    borderRadius: '50%',
  },
  cardInner: {
    position: 'relative',
    padding: '16px 20px',
    background: colors.card,
    borderRadius: 13,
    zIndex: 2,
    overflow: 'hidden',
  },
  gradientFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 13,
    background: 'linear-gradient(135deg, rgba(167,139,250,0.10) 0%, rgba(99,102,241,0.07) 20%, rgba(37,99,235,0.06) 40%, rgba(56,189,248,0.05) 65%, rgba(0,255,255,0.06) 100%)',
  },
  cardContent: {
    position: 'relative',
    zIndex: 1,
  },
  achievementName: {
    fontSize: 15,
    fontWeight: 500,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  unlockDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  // Locked card - grey and muted
  cardLocked: {
    padding: '16px 20px',
    background: colors.card,
    border: `1px solid ${colors.borderLocked}`,
    borderRadius: 14,
  },
  achievementNameLocked: {
    fontSize: 15,
    fontWeight: 500,
    color: colors.textLocked,
    letterSpacing: -0.2,
  },
};
