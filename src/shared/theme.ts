/**
 * MyAccountableAI Design System
 * Premium dark minimal design - 90% grayscale, color only on progress elements
 */

// =============================================================
// BACKGROUND & SURFACE COLORS
// =============================================================
export const colors = {
  // Backgrounds
  background: '#0A0A0A',        // Near black - app background
  card: '#0D0D0D',              // Barely lifted - card backgrounds
  elevated: '#111111',          // Modals, dropdowns

  // Borders & Dividers
  border: '#1A1A1A',            // Card borders, dividers
  borderLight: '#2A2A2A',       // Button borders
  borderSubtle: '#333333',      // Dashed borders

  // Text
  textPrimary: '#FFFFFF',       // Headlines, scores, main numbers
  textSecondary: '#A1A1A1',     // Body, descriptions
  textMuted: '#6B6B6B',         // Labels, meta info
  textFaint: '#404040',         // Hints, timestamps
  textDisabled: '#2A2A2A',      // Inactive text

  // Progress bar/ring track
  track: '#1A1A1A',

  // =============================================================
  // 6-TIER ACCENT COLORS (Performance % / Goal Priority)
  // =============================================================

  // Tier 1: Cyan (90-100% / Goal #1) - Crushing It
  tier1: {
    main: '#00FFFF',
    dark: '#06B6D4',
    light: '#A5F3FC',
    glow: 'rgba(0, 255, 255, 0.4)',
    tint: 'rgba(0, 255, 255, 0.15)',
  },

  // Tier 2: Light Blue (70-89% / Goal #2) - Strong
  tier2: {
    main: '#38BDF8',
    dark: '#0284C7',
    light: '#7DD3FC',
    glow: 'rgba(56, 189, 248, 0.4)',
    tint: 'rgba(56, 189, 248, 0.15)',
  },

  // Tier 3: Blue (50-69% / Goal #3) - Average
  tier3: {
    main: '#2563EB',
    dark: '#1D4ED8',
    light: '#60A5FA',
    glow: 'rgba(37, 99, 235, 0.4)',
    tint: 'rgba(37, 99, 235, 0.15)',
  },

  // Tier 4: Light Purple (30-49% / Goal #4) - Needs Work
  tier4: {
    main: '#A78BFA',
    dark: '#7C3AED',
    light: '#DDD6FE',
    glow: 'rgba(167, 139, 250, 0.4)',
    tint: 'rgba(167, 139, 250, 0.15)',
  },

  // Tier 5: Deep Purple (10-29% / Goal #5) - Struggling
  tier5: {
    main: '#7C3AED',
    dark: '#5521B6',
    light: '#A78BFA',
    glow: 'rgba(124, 58, 237, 0.4)',
    tint: 'rgba(124, 58, 237, 0.15)',
  },

  // Tier 6: Gray (0-9%) - Inactive
  tier6: {
    main: '#4B5563',
    dark: '#374151',
    light: '#6B7280',
    glow: 'rgba(75, 85, 99, 0.4)',
    tint: 'rgba(75, 85, 99, 0.15)',
  },

  // =============================================================
  // GOAL PRIORITY COLORS (6-10: Grays, 11+: Same)
  // =============================================================
  goalGrays: {
    6: '#9CA3AF',   // Cool Steel
    7: '#848B98',   // Slate Grey
    8: '#6B7280',   // Slate Grey
    9: '#5B6472',   // Blue Slate
    10: '#414B5A',  // Charcoal Blue
    default: '#374151', // 11+ Charcoal Blue
  },
} as const;

// =============================================================
// TYPOGRAPHY
// =============================================================
export const typography = {
  // Font family (system fonts)
  fontFamily: {
    default: 'System',
  },

  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
    '5xl': 48,
    '6xl': 56,
  },

  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 0.8,
  },
} as const;

// =============================================================
// SPACING
// =============================================================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
} as const;

// =============================================================
// BORDER RADIUS
// =============================================================
export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 14,
  '3xl': 16,
  full: 9999,
} as const;

// =============================================================
// SHADOWS (minimal - premium dark aesthetic)
// =============================================================
export const shadows = {
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
} as const;

// =============================================================
// HELPER FUNCTIONS
// =============================================================

/**
 * Get tier colors based on percentage (0-100)
 * Tier 1: 90-100% (Crushing It)
 * Tier 2: 70-89% (Strong)
 * Tier 3: 50-69% (Average)
 * Tier 4: 30-49% (Needs Work)
 * Tier 5: 10-29% (Struggling)
 * Tier 6: 0-9% (Inactive)
 */
export function getTierByPercentage(percentage: number) {
  if (percentage >= 90) return colors.tier1;
  if (percentage >= 70) return colors.tier2;
  if (percentage >= 50) return colors.tier3;
  if (percentage >= 30) return colors.tier4;
  if (percentage >= 10) return colors.tier5;
  return colors.tier6;
}

/**
 * Get tier number (1-6) based on percentage
 */
export function getTierNumber(percentage: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (percentage >= 90) return 1;
  if (percentage >= 70) return 2;
  if (percentage >= 50) return 3;
  if (percentage >= 30) return 4;
  if (percentage >= 10) return 5;
  return 6;
}

/**
 * Get goal color based on priority (1-based index)
 */
export function getGoalColor(priority: number) {
  switch (priority) {
    case 1: return colors.tier1;
    case 2: return colors.tier2;
    case 3: return colors.tier3;
    case 4: return colors.tier4;
    case 5: return colors.tier5;
    case 6: return { main: colors.goalGrays[6], glow: 'rgba(156, 163, 175, 0.3)' };
    case 7: return { main: colors.goalGrays[7], glow: 'rgba(132, 139, 152, 0.3)' };
    case 8: return { main: colors.goalGrays[8], glow: 'rgba(107, 114, 128, 0.3)' };
    case 9: return { main: colors.goalGrays[9], glow: 'rgba(91, 100, 114, 0.3)' };
    case 10: return { main: colors.goalGrays[10], glow: 'rgba(65, 75, 90, 0.3)' };
    default: return { main: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.25)' };
  }
}

/**
 * Get text color for goal badge based on priority
 */
export function getGoalBadgeTextColor(priority: number): string {
  // Light text on dark backgrounds, dark text on light backgrounds
  if (priority === 1 || priority === 2 || priority === 6) return '#000000';
  return '#FFFFFF';
}
