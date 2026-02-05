'use client';

import { useEffect, useState } from 'react';
import { getTierByPercentage } from '@/shared';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showPercentSymbol?: boolean;
  animated?: boolean;
}

export default function ProgressRing({
  percent,
  size = 88,
  strokeWidth = 8,
  label,
  showPercentSymbol = true,
  animated = true,
}: ProgressRingProps) {
  const [displayPercent, setDisplayPercent] = useState(animated ? 0 : percent);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (displayPercent / 100) * circumference;
  const tierColor = getTierByPercentage(percent);

  useEffect(() => {
    if (!animated) {
      setDisplayPercent(percent);
      return;
    }
    const timeout = setTimeout(() => setDisplayPercent(percent), 50);
    return () => clearTimeout(timeout);
  }, [percent, animated]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tierColor.main}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: animated ? 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease' : 'none',
          }}
        />
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontSize={size * 0.24}
          fontWeight="700"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {Math.round(displayPercent)}{showPercentSymbol ? '%' : ''}
        </text>
      </svg>
      {label && (
        <span style={{ fontSize: 11, color: '#6B6B6B', fontWeight: 500 }}>{label}</span>
      )}
    </div>
  );
}
