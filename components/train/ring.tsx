'use client';

import { useEffect, useRef, useState } from 'react';
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
  /**
   * When true, the arc animates from 0 to `value` on mount (~0.8s ease-out).
   * Respects prefers-reduced-motion: motion is skipped when reduced motion is preferred.
   */
  animate?: boolean;
  /**
   * When set alongside `countUp`, the number animates from 0 to `displayValue` on mount.
   * The animated value is rendered inside the ring (in addition to any children, which are
   * left unchanged). If you want ONLY the animated number, omit children.
   */
  displayValue?: number;
  /**
   * Enable count-up animation for `displayValue`. No effect if `displayValue` is undefined.
   */
  countUp?: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A circular progress ring (SVG). Used for scores and the daily goal. */
export function Ring({
  value,
  size = 120,
  stroke = 10,
  color = '#FFC857',
  trackClassName = 'text-white/10',
  className,
  children,
  animate = false,
  displayValue,
  countUp = false,
}: RingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const targetOffset = circumference - (clamped / 100) * circumference;

  // Arc animation: start fully hidden, transition to target offset on mount.
  const [arcOffset, setArcOffset] = useState(
    animate && !prefersReducedMotion() ? circumference : targetOffset,
  );

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setArcOffset(targetOffset);
      return;
    }
    // Small rAF delay ensures the CSS transition fires after initial render.
    const id = requestAnimationFrame(() => {
      setArcOffset(targetOffset);
    });
    return () => cancelAnimationFrame(id);
  }, [animate, targetOffset]);

  // Count-up animation for displayValue.
  const [displayedNumber, setDisplayedNumber] = useState(
    countUp && displayValue !== undefined && !prefersReducedMotion() ? 0 : (displayValue ?? 0),
  );
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!countUp || displayValue === undefined || prefersReducedMotion()) {
      setDisplayedNumber(displayValue ?? 0);
      return;
    }
    const start = performance.now();
    const duration = 800; // ms — matches arc animation

    function tick(now: number) {
      const elapsed = Math.min(now - start, duration);
      const progress = elapsed / duration;
      // Ease-out: 1 - (1-t)^2
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplayedNumber(Math.round(eased * (displayValue as number)));
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [countUp, displayValue]);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
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
          strokeDashoffset={arcOffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {displayValue !== undefined && countUp ? (
          <>
            <span className="font-display tabular-nums">{displayedNumber}</span>
            {children}
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
