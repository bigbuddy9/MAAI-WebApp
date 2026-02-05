'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Design tokens
const t = {
  bg: '#000000',
  bgCard: '#0d0d0d',
  bgElevated: '#111111',
  border: '#1a1a1a',
  borderLight: '#2a2a2a',
  fg: '#ffffff',
  fgSecondary: '#6b6b6b',
  fgMuted: '#404040',
  cyan: '#00FFFF',
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
  radiusLg: 8,
  radius2xl: 16,
};

// Demo data for showcase
const DEMO_GOALS = [
  { id: 1, name: 'Career Growth', priority: 1, color: '#00FFFF' },
  { id: 2, name: 'Health & Fitness', priority: 2, color: '#38BDF8' },
  { id: 3, name: 'Learning', priority: 3, color: '#2563EB' },
];

const DEMO_TASKS = [
  { id: 1, name: 'Complete morning workout', goalId: 2, goalColor: '#38BDF8', completed: true },
  { id: 2, name: 'Read for 30 minutes', goalId: 3, goalColor: '#2563EB', completed: true },
  { id: 3, name: 'Work on project proposal', goalId: 1, goalColor: '#00FFFF', completed: true },
  { id: 4, name: 'Review weekly goals', goalId: 1, goalColor: '#00FFFF', completed: false },
  { id: 5, name: 'Meditation session', goalId: 2, goalColor: '#38BDF8', completed: false },
];

// Tier colors for progress rings
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

// Progress Ring Component
function ProgressRing({
  percent,
  label,
  size = 80,
  strokeWidth = 7,
}: {
  percent: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}) {
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayPercent(percent), 300);
    return () => clearTimeout(timer);
  }, [percent]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (displayPercent / 100) * circumference;
  const tierColor = getTierColor(displayPercent);
  const canvasSize = size + 16;
  const center = canvasSize / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: canvasSize, height: canvasSize }}>
        <svg width={canvasSize} height={canvasSize}>
          <defs>
            <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
          </defs>
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke={t.border} strokeWidth={strokeWidth}
          />
          {displayPercent > 0 && (
            <>
              <circle
                cx={center} cy={center} r={radius}
                fill="none" stroke={tierColor} strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${center} ${center})`}
                filter={`url(#glow-${label})`}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
              <circle
                cx={center} cy={center} r={radius}
                fill="none" stroke={tierColor} strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${center} ${center})`}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </>
          )}
        </svg>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: canvasSize, height: canvasSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: t.fg }}>
            {Math.round(displayPercent)}
          </span>
        </div>
      </div>
      <span style={{
        fontSize: 10, color: t.fgSecondary, marginTop: 6,
        textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500,
      }}>
        {label}
      </span>
    </div>
  );
}

// Demo Task Card
function DemoTaskCard({ task, animateIn, delay }: { task: typeof DEMO_TASKS[0]; animateIn: boolean; delay: number }) {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (animateIn) {
      const showTimer = setTimeout(() => setVisible(true), delay);
      const checkTimer = setTimeout(() => setChecked(task.completed), delay + 400);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(checkTimer);
      };
    }
  }, [animateIn, delay, task.completed]);

  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: 14,
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
    }}>
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 4,
        backgroundColor: checked ? task.goalColor : t.border,
        transition: 'background-color 0.3s ease',
      }} />

      {/* Content */}
      <div style={{ flex: 1, marginLeft: 12 }}>
        <div style={{
          fontSize: 15,
          fontWeight: 500,
          color: checked ? t.fg : t.fgSecondary,
        }}>
          {task.name}
        </div>
      </div>

      {/* Checkbox */}
      <div style={{
        width: 21, height: 21,
        borderRadius: 21,
        backgroundColor: checked ? task.goalColor : t.bgElevated,
        border: checked ? 'none' : `2px solid ${t.borderLight}`,
        marginLeft: 12,
        transition: 'all 0.3s ease',
        transform: checked ? 'scale(1.1)' : 'scale(1)',
      }} />
    </div>
  );
}

// Plan Selection Modal
function PlanSelectionModal({
  onSelectPlan,
  isRedirecting,
  selectedPlan,
}: {
  onSelectPlan: (plan: 'monthly' | 'yearly') => void;
  isRedirecting: boolean;
  selectedPlan: string | null;
}) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 24,
    }}>
      <div className="modal-border-wrap" style={{
        width: '100%',
        maxWidth: 420,
        borderRadius: t.radius2xl + 1,
        padding: 1,
        background: 'linear-gradient(135deg, #C878FF, #7850DC, #00C8FF, #7850DC, #C878FF)',
        backgroundSize: '200% 200%',
      }}>
        <div style={{
          width: '100%',
          backgroundColor: t.bgCard,
          borderRadius: t.radius2xl,
          padding: '32px 24px',
        }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            color: t.fg,
            margin: '0 0 8px',
            textAlign: 'center',
          }}>
            Start Your Free Trial
          </h2>
          <p style={{
            fontSize: 14,
            color: t.fgSecondary,
            margin: '0 0 24px',
            textAlign: 'center',
          }}>
            7 days free, then choose your plan. Cancel anytime.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Monthly Option */}
            <button
              onClick={() => onSelectPlan('monthly')}
              disabled={isRedirecting}
              style={{
                width: '100%',
                padding: '18px 20px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: `2px solid ${selectedPlan === 'monthly' ? t.cyan : t.border}`,
                borderRadius: t.radiusLg,
                cursor: isRedirecting ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.2s, opacity 0.2s',
                opacity: isRedirecting && selectedPlan !== 'monthly' ? 0.5 : 1,
                position: 'relative',
                fontFamily: t.font,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: t.fg }}>Monthly</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: t.fg }}>$9.99</span>
                <span style={{ fontSize: 14, color: t.fgSecondary }}>/month</span>
              </div>
              <p style={{ fontSize: 13, color: t.fgSecondary, margin: '6px 0 0' }}>Billed monthly</p>
              {selectedPlan === 'monthly' && isRedirecting && (
                <div style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 20, height: 20,
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTop: `2px solid ${t.cyan}`,
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
              )}
            </button>

            {/* Yearly Option */}
            <button
              onClick={() => onSelectPlan('yearly')}
              disabled={isRedirecting}
              style={{
                width: '100%',
                padding: '18px 20px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: `2px solid ${selectedPlan === 'yearly' ? t.cyan : t.border}`,
                borderRadius: t.radiusLg,
                cursor: isRedirecting ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.2s, opacity 0.2s',
                opacity: isRedirecting && selectedPlan !== 'yearly' ? 0.5 : 1,
                position: 'relative',
                fontFamily: t.font,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: t.fg }}>Yearly</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: t.bg,
                  backgroundColor: t.cyan,
                  padding: '2px 8px',
                  borderRadius: 4,
                }}>
                  Save 17%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: t.fg }}>$99.99</span>
                <span style={{ fontSize: 14, color: t.fgSecondary }}>/year</span>
              </div>
              <p style={{ fontSize: 13, color: t.fgSecondary, margin: '6px 0 0' }}>$8.33/month, billed annually</p>
              {selectedPlan === 'yearly' && isRedirecting && (
                <div style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 20, height: 20,
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTop: `2px solid ${t.cyan}`,
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Page
export default function VerifySuccessPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [animateTasks, setAnimateTasks] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const hasShownDemo = useRef(false);

  // Start animation sequence when session is ready
  useEffect(() => {
    if (!isLoading && session && !hasShownDemo.current) {
      hasShownDemo.current = true;
      // Start task animations immediately
      setAnimateTasks(true);
      // Show modal after demo plays (3 seconds)
      const timer = setTimeout(() => setShowModal(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [session, isLoading]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [session, isLoading, router]);

  const handleSelectPlan = async (plan: 'monthly' | 'yearly') => {
    if (!session || isRedirecting) return;
    setSelectedPlan(plan);
    setIsRedirecting(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
          plan,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setIsRedirecting(false);
        setSelectedPlan(null);
      }
    } catch {
      setIsRedirecting(false);
      setSelectedPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div style={s.loadingPage}>
        <div style={s.spinner} />
      </div>
    );
  }

  if (!session) return null;

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={s.page}>
      {/* Demo Dashboard */}
      <div style={s.dashboardContainer}>
        {/* View Mode Tabs */}
        <div style={s.tabsContainer}>
          <div style={s.tabs}>
            <div style={{ ...s.tab, ...s.tabActive }}>Daily</div>
            <div style={s.tab}>Weekly</div>
            <div style={s.tab}>Monthly</div>
          </div>
        </div>

        {/* Date Header */}
        <div style={s.dateHeader}>
          <span style={s.navArrow}>{'\u2039'}</span>
          <span style={s.dateLabel}>{dateLabel}</span>
          <span style={{ ...s.navArrow, opacity: 0.3 }}>{'\u203A'}</span>
        </div>

        {/* Progress Rings */}
        <div style={s.ringsContainer}>
          <ProgressRing percent={78} label="Score" />
          <ProgressRing percent={60} label="Completion" />
          <ProgressRing percent={75} label="Streak" />
        </div>

        {/* Task List */}
        <div style={s.taskList}>
          {DEMO_TASKS.map((task, index) => (
            <DemoTaskCard
              key={task.id}
              task={task}
              animateIn={animateTasks}
              delay={index * 200}
            />
          ))}
        </div>
      </div>

      {/* Plan Selection Modal */}
      {showModal && (
        <PlanSelectionModal
          onSelectPlan={handleSelectPlan}
          isRedirecting={isRedirecting}
          selectedPlan={selectedPlan}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes borderRotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .modal-border-wrap {
          animation: borderRotate 4s ease-in-out infinite;
        }
        * { -webkit-font-smoothing: antialiased; }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    fontFamily: t.font,
    position: 'relative',
  },
  loadingPage: {
    minHeight: '100vh',
    backgroundColor: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2px solid #333',
    borderTop: `2px solid ${t.cyan}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  dashboardContainer: {
    maxWidth: 520,
    margin: '0 auto',
    padding: '16px',
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabs: {
    display: 'flex',
    backgroundColor: t.bgElevated,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    color: t.fgSecondary,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  tabActive: {
    color: t.fg,
    backgroundColor: t.border,
  },
  dateHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  navArrow: {
    fontSize: 24,
    color: t.fgSecondary,
  },
  dateLabel: {
    fontSize: 17,
    fontWeight: 600,
    color: t.fg,
  },
  ringsContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
};
