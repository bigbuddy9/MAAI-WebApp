'use client';

import { useState, useEffect, useRef } from 'react';

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

const ASCEND_DURATION = 4000;
const TRANSITION_DURATION = 2000;

interface FloatingDotsProps {
  particleCount?: number;
  side?: 'left' | 'right' | 'both' | 'full';
  width?: string;
}

export function FloatingDots({
  particleCount = 80,
  side = 'full',
  width = '200px'
}: FloatingDotsProps) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
    const initialParticles: FloatingParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const floatAngle = Math.random() * Math.PI * 2;
      const floatSpeed = 0.01 + Math.random() * 0.02;
      const ascendSpeed = 0.15 + Math.random() * 0.15;
      const horizontalDrift = (Math.random() - 0.5) * 0.03;

      initialParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100 + 20,
        vx: horizontalDrift,
        vy: -ascendSpeed,
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

  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;

      setParticles(prev =>
        prev.map(particle => {
          let currentVx = particle.vx;
          let currentVy = particle.vy;

          if (elapsed > ASCEND_DURATION) {
            const transitionProgress = Math.min(
              (elapsed - ASCEND_DURATION) / TRANSITION_DURATION,
              1
            );
            const eased = 1 - Math.pow(1 - transitionProgress, 3);
            currentVx = particle.vx + (particle.targetVx - particle.vx) * eased * 0.02;
            currentVy = particle.vy + (particle.targetVy - particle.vy) * eased * 0.02;
          }

          let newX = particle.x + currentVx;
          let newY = particle.y + currentVy;

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

  const now = performance.now();

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    ...(side === 'full' && { left: 0, right: 0 }),
    ...(side === 'left' && { left: 0, width }),
    ...(side === 'right' && { right: 0, width }),
  };

  return (
    <div style={containerStyle}>
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

// Convenience component for left+right dots
export function FloatingDotsSides({ particleCount = 60 }: { particleCount?: number }) {
  return (
    <>
      <FloatingDots side="left" particleCount={particleCount} width="25%" />
      <FloatingDots side="right" particleCount={particleCount} width="25%" />
    </>
  );
}
