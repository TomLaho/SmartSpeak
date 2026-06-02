'use client';

import { cn } from '@/lib/utils';

interface RingProps {
  /** 0-100 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackClassName?: string;
  className?: string;
  children?: React.ReactNode;
}

/** A circular progress ring (SVG). Used for scores and the daily goal. */
export function Ring({
  value,
  size = 120,
  stroke = 10,
  color = '#7c3aed',
  trackClassName = 'text-white/10',
  className,
  children,
}: RingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackClassName}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
