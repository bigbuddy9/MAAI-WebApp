'use client';

import { useEffect, useState } from 'react';

interface StreakRingProps {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  animated?: boolean;
}

export default function StreakRing({
  value,
  maxValue,
  size = 88,
  strokeWidth = 8,
  label = 'Streak',
  animated = true,
}: StreakRingProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const percent = maxValue ? Math.min(100, (displayValue / maxValue) * 100) : Math.min(100, displayValue * 3.33);
  const dashOffset = circumference - (percent / 100) * circumference;

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }
    const timeout = setTimeout(() => setDisplayValue(value), 50);
    return () => clearTimeout(timeout);
  }, [value, animated]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#00FFFF"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: animated ? 'stroke-dashoffset 0.8s ease-out' : 'none',
          }}
        />
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
          {Math.round(displayValue)}
        </text>
      </svg>
      {label && (
        <span style={{ fontSize: 11, color: '#6B6B6B', fontWeight: 500 }}>{label}</span>
      )}
    </div>
  );
}
