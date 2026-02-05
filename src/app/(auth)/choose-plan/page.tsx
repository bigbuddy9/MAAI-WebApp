'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const t = {
  bg: '#000000',
  bgCard: '#0d0d0d',
  border: '#1a1a1a',
  fg: '#ffffff',
  fgSecondary: '#6b6b6b',
  cyan: '#00FFFF',
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
  radiusLg: 8,
  radius2xl: 16,
};

// ─── FloatingDots ───
interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  flickerSpeed: number;
  flickerOffset: number;
}

function FloatingDots({ particleCount = 165 }: { particleCount?: number }) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const initialParticles: FloatingParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.01 + Math.random() * 0.02;
      initialParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 1.5,
        opacity: 0.4 + Math.random() * 0.4,
        flickerSpeed: 2 + Math.random() * 4,
        flickerOffset: Math.random() * Math.PI * 2,
      });
    }
    setParticles(initialParticles);
  }, [particleCount]);

  useEffect(() => {
    if (particles.length === 0) return;
    const animate = () => {
      setParticles(prev =>
        prev.map(particle => {
          let newX = particle.x + particle.vx;
          let newY = particle.y + particle.vy;
          if (newX < -2) newX = 102;
          if (newX > 102) newX = -2;
          if (newY < -2) newY = 102;
          if (newY > 102) newY = -2;
          return { ...particle, x: newX, y: newY };
        })
      );
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [particles.length]);

  const now = performance.now();

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
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

export default function ChoosePlanPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

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
      <div style={s.page}>
        <div style={s.spinner} />
      </div>
    );
  }

  return (
    <div style={s.page}>
      <FloatingDots particleCount={165} />

      <div style={s.container}>
        <div className="card-border-wrap" style={s.cardOuter}>
          <div style={s.card}>
            <h1 style={s.title}>Choose Your Plan</h1>
            <p style={s.subtitle}>Start your 7-day free trial. Cancel anytime.</p>

            <div style={s.plansContainer}>
              {/* Monthly */}
              <button
                onClick={() => handleSelectPlan('monthly')}
                disabled={isRedirecting}
                style={{
                  ...s.planCard,
                  borderColor: selectedPlan === 'monthly' ? t.cyan : t.border,
                  opacity: isRedirecting && selectedPlan !== 'monthly' ? 0.5 : 1,
                }}
              >
                <div style={s.planHeader}>
                  <span style={s.planName}>Monthly</span>
                </div>
                <div style={s.priceRow}>
                  <span style={s.price}>$9.99</span>
                  <span style={s.pricePeriod}>/month</span>
                </div>
                <p style={s.planDescription}>Billed monthly</p>
                {selectedPlan === 'monthly' && isRedirecting && (
                  <div style={s.planSpinner} />
                )}
              </button>

              {/* Yearly */}
              <button
                onClick={() => handleSelectPlan('yearly')}
                disabled={isRedirecting}
                style={{
                  ...s.planCard,
                  borderColor: selectedPlan === 'yearly' ? t.cyan : t.border,
                  opacity: isRedirecting && selectedPlan !== 'yearly' ? 0.5 : 1,
                }}
              >
                <div style={s.planHeader}>
                  <span style={s.planName}>Yearly</span>
                  <span style={s.saveBadge}>Save 17%</span>
                </div>
                <div style={s.priceRow}>
                  <span style={s.price}>$99.99</span>
                  <span style={s.pricePeriod}>/year</span>
                </div>
                <p style={s.planDescription}>$8.33/month, billed annually</p>
                {selectedPlan === 'yearly' && isRedirecting && (
                  <div style={s.planSpinner} />
                )}
              </button>
            </div>
          </div>
        </div>
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
        * { -webkit-font-smoothing: antialiased; }
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
    maxWidth: 480,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: t.fgSecondary,
    margin: '0 0 32px',
    textAlign: 'center',
  },
  plansContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  planCard: {
    width: '100%',
    padding: '20px 24px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: `1px solid ${t.border}`,
    borderRadius: t.radiusLg,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s, opacity 0.2s',
    position: 'relative',
    fontFamily: t.font,
  },
  planHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: 600,
    color: t.fg,
  },
  saveBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: t.bg,
    backgroundColor: t.cyan,
    padding: '2px 8px',
    borderRadius: 4,
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: 700,
    color: t.fg,
  },
  pricePeriod: {
    fontSize: 14,
    color: t.fgSecondary,
  },
  planDescription: {
    fontSize: 13,
    color: t.fgSecondary,
    margin: '8px 0 0',
  },
  planSpinner: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 20,
    height: 20,
    border: '2px solid rgba(255,255,255,0.2)',
    borderTop: `2px solid ${t.cyan}`,
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2px solid #333',
    borderTop: `2px solid ${t.cyan}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
