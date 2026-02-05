'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const t = {
  bg: '#000000',
  cyan: '#00FFFF',
  fg: '#ffffff',
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
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
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
    }
  }, [session, isLoading, router]);

  // Automatically redirect to checkout when session is ready
  useEffect(() => {
    if (!isLoading && session && !hasStarted.current) {
      hasStarted.current = true;
      redirectToCheckout();
    }
  }, [session, isLoading]);

  const redirectToCheckout = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // If checkout fails, go back to tracker
        router.replace('/tracker');
      }
    } catch {
      router.replace('/tracker');
    }
  };

  return (
    <div style={s.page}>
      <FloatingDots particleCount={165} />

      <div style={s.container}>
        <div style={s.spinnerWrapper}>
          <div style={s.spinner} />
          <p style={s.text}>Setting up your subscription...</p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
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
    position: 'relative',
    zIndex: 10,
  },
  spinnerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #333',
    borderTop: `3px solid ${t.cyan}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    fontSize: 16,
    color: t.fg,
    fontWeight: 500,
    margin: 0,
  },
};
