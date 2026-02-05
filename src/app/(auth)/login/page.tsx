'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

// Exact design tokens from myaccountable.ai
const t = {
  bg: '#000000',
  bgWindow: '#0a0a0a',
  bgCard: '#0d0d0d',
  border: '#1a1a1a',
  fg: '#ffffff',
  fgSecondary: '#6b6b6b',
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
  radiusLg: 8,
  radius2xl: 16,
};

// ─── FloatingDots — particles rise then transition to floating ───
interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetVx: number;
  targetVy: number;
  size: number;
  opacity: number;
  flickerSpeed: number;
  flickerOffset: number;
}

const ASCEND_DURATION = 4000; // 4 seconds of rising
const TRANSITION_DURATION = 2000; // 2 seconds to transition to floating

function FloatingDots({ particleCount = 165 }: { particleCount?: number }) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  // Initialize particles with upward velocity
  useEffect(() => {
    startTimeRef.current = performance.now();
    const initialParticles: FloatingParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      // Random angle for eventual floating direction
      const floatAngle = Math.random() * Math.PI * 2;
      const floatSpeed = 0.01 + Math.random() * 0.02;

      // Initial upward velocity - fast ascending like main website
      const ascendSpeed = 0.15 + Math.random() * 0.15;
      const horizontalDrift = (Math.random() - 0.5) * 0.03;

      initialParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100 + 20, // Start slightly lower
        vx: horizontalDrift,
        vy: -ascendSpeed, // Negative = upward
        targetVx: Math.cos(floatAngle) * floatSpeed,
        targetVy: Math.sin(floatAngle) * floatSpeed,
        size: 1 + Math.random() * 1.5,
        opacity: 0.4 + Math.random() * 0.4,
        flickerSpeed: 2 + Math.random() * 4,
        flickerOffset: Math.random() * Math.PI * 2,
      });
    }
    setParticles(initialParticles);
  }, [particleCount]);

  // Animation loop with phase transitions
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;

      setParticles(prev =>
        prev.map(particle => {
          let currentVx = particle.vx;
          let currentVy = particle.vy;

          // Phase 1: Ascending (0 to ASCEND_DURATION)
          // Phase 2: Transition (ASCEND_DURATION to ASCEND_DURATION + TRANSITION_DURATION)
          // Phase 3: Floating (after transition)

          if (elapsed > ASCEND_DURATION) {
            const transitionProgress = Math.min(
              (elapsed - ASCEND_DURATION) / TRANSITION_DURATION,
              1
            );
            // Smooth easing for transition
            const eased = 1 - Math.pow(1 - transitionProgress, 3);

            // Interpolate velocity from current ascending to target floating
            currentVx = particle.vx + (particle.targetVx - particle.vx) * eased * 0.02;
            currentVy = particle.vy + (particle.targetVy - particle.vy) * eased * 0.02;
          }

          let newX = particle.x + currentVx;
          let newY = particle.y + currentVy;

          // Wrap around edges
          if (newX < -2) newX = 102;
          if (newX > 102) newX = -2;
          if (newY < -2) newY = 102;
          if (newY > 102) newY = -2;

          return {
            ...particle,
            x: newX,
            y: newY,
            vx: currentVx,
            vy: currentVy,
          };
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particles.length]);

  // Get current time for flicker calculation
  const now = performance.now();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {particles.map(particle => {
        const flicker = Math.sin((now / 1000) * particle.flickerSpeed + particle.flickerOffset);
        const flickerOpacity = particle.opacity * (0.7 + flicker * 0.3);

        return (
          <div
            key={particle.id}
            style={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              opacity: flickerOpacity,
              boxShadow: `0 0 ${particle.size * 2}px rgba(255, 255, 255, ${flickerOpacity * 0.5})`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Login Page ───
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn, session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session) {
      router.replace('/tracker');
    }
  }, [session, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Floating dots background */}
      <FloatingDots particleCount={165} />

      {/* Card — dead center, solid background */}
      <div style={s.container}>
        <div className="card-border-wrap" style={s.cardOuter}>
          <div style={s.card}>
            <h1 style={s.title}>Welcome back</h1>
            <p style={s.subtitle}>Log in to view your dashboard.</p>

            <form onSubmit={handleSubmit} style={s.form}>
              {error && (
                <div style={s.errorBox}>
                  <span style={s.errorText}>{error}</span>
                </div>
              )}

              <div style={s.field}>
                <label style={s.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...s.input,
                    borderColor: focusedField === 'email' ? t.fgSecondary : t.border,
                  }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div style={s.field}>
                <label style={s.label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...s.input,
                    borderColor: focusedField === 'password' ? t.fgSecondary : t.border,
                  }}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  ...s.submitBtn,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? (
                  <div style={s.btnSpinner} />
                ) : (
                  'Log In'
                )}
              </button>
            </form>

            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>or</span>
              <div style={s.dividerLine} />
            </div>

            <p style={s.switchText}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" style={s.switchLink}>Sign up for free</Link>
            </p>
          </div>
        </div>

        <p style={s.legal}>
          By signing in, you agree to our{' '}
          <a href="https://myaccountable.ai/terms" style={s.legalLink}>Terms</a>
          {' '}and{' '}
          <a href="https://myaccountable.ai/privacy" style={s.legalLink}>Privacy Policy</a>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes borderRotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .card-border-wrap {
          background-size: 200% 200% !important;
          animation: borderRotate 4s ease-in-out infinite !important;
        }
        input::placeholder { color: ${t.fgSecondary}; }
        input:focus { outline: none; }
        button:hover:not(:disabled) { opacity: 0.9 !important; }
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: t.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: t.font,
    position: 'relative',
    overflow: 'hidden',
  },
  container: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
    padding: '24px',
  },
  cardOuter: {
    width: '100%',
    borderRadius: t.radius2xl + 1,
    padding: 1,
    background: 'linear-gradient(135deg, #C878FF, #7850DC, #00C8FF, #7850DC, #C878FF)',
    backgroundSize: '200% 200%',
  },
  card: {
    width: '100%',
    backgroundColor: t.bgCard,
    borderRadius: t.radius2xl,
    padding: '40px 32px',
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: t.fg,
    margin: '0 0 8px',
    letterSpacing: -0.5,
    lineHeight: 1.25,
  },
  subtitle: {
    fontSize: 14,
    color: t.fgSecondary,
    margin: '0 0 32px',
    lineHeight: 1.625,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: t.fg,
  },
  input: {
    padding: '12px 14px',
    backgroundColor: t.bgWindow,
    border: `1px solid ${t.border}`,
    borderRadius: t.radiusLg,
    color: t.fg,
    fontSize: 14,
    fontFamily: t.font,
    transition: 'border-color 0.15s',
  },
  submitBtn: {
    padding: '12px 16px',
    backgroundColor: t.fg,
    color: t.bg,
    border: 'none',
    borderRadius: t.radiusLg,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: t.font,
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    transition: 'opacity 0.15s',
  },
  btnSpinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(0,0,0,0.15)',
    borderTop: '2px solid #000000',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  errorBox: {
    padding: '10px 14px',
    backgroundColor: 'rgba(255, 101, 104, 0.08)',
    border: '1px solid rgba(255, 101, 104, 0.2)',
    borderRadius: t.radiusLg,
  },
  errorText: {
    color: '#ff6568',
    fontSize: 13,
    lineHeight: '18px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: t.border,
  },
  dividerText: {
    fontSize: 12,
    color: t.fgSecondary,
  },
  switchText: {
    fontSize: 14,
    color: t.fgSecondary,
    textAlign: 'center',
    margin: 0,
  },
  switchLink: {
    color: t.fg,
    fontWeight: 500,
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
  legal: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: t.fgSecondary,
    lineHeight: '18px',
  },
  legalLink: {
    color: t.fgSecondary,
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
};
