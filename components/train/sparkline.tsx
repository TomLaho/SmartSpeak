'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

/**
 * Tiny inline SVG trend line for dimension progress.
 * Renders a smooth polyline scaled to the min/max of the values,
 * with a subtle area fill and a dot on the last point.
 * Shows nothing meaningful with fewer than 2 values.
 */
export function Sparkline({
  values,
  width = 64,
  height = 24,
  color = '#FFC857',
  className,
}: SparklineProps) {
  const uid = useId();
  const gradientId = `spark-fill-${uid.replace(/:/g, '')}`;

  if (values.length < 2) {
    // Placeholder: three short dashes indicating no trend yet.
    return (
      <span className={cn('inline-flex items-center gap-0.5', className)}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block rounded-full bg-white/20"
            style={{ width: 6, height: 2 }}
          />
        ))}
      </span>
    );
  }

  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // prevent division by zero when all values equal

  const toX = (i: number) => pad + (i / (values.length - 1)) * innerW;
  const toY = (v: number) => pad + innerH - ((v - min) / range) * innerH;

  const points = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  // Area fill path: trace the line, then close down to the baseline.
  const lastX = toX(values.length - 1);
  const firstX = toX(0);
  const bottomY = pad + innerH;
  const lineTo = values.map((v, i) => `L ${toX(i)},${toY(v)}`).join(' ');
  const areaPath = `M ${firstX},${bottomY} ${lineTo} L ${lastX},${bottomY} Z`;

  const lastDotX = toX(values.length - 1);
  const lastDotY = toY(values[values.length - 1]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
        stroke="none"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on last point */}
      <circle cx={lastDotX} cy={lastDotY} r={2.5} fill={color} />
    </svg>
  );
}
