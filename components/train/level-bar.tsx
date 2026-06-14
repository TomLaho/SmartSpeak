'use client';

import { cn } from '@/lib/utils';
import { levelFor } from '@/lib/local-store';

interface LevelBarProps {
  xp: number;
  className?: string;
}

/**
 * Compact single-row level indicator.
 * Shows: gold-rimmed level badge, title, and a spotlight-gold shimmer progress bar.
 */
export function LevelBar({ xp, className }: LevelBarProps) {
  const { level, title, xpIntoLevel, xpForNext } = levelFor(xp);
  const pct = xpForNext > 0 ? Math.min(100, (xpIntoLevel / xpForNext) * 100) : 100;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Level badge */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-spotlight text-xs font-bold text-spotlight font-display tabular-nums"
        aria-label={`Level ${level}`}
      >
        {level}
      </div>

      {/* Title + bar */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-white/70">{title}</span>
          <span className="shrink-0 text-xs text-white/40 tabular-nums">
            {xpIntoLevel}/{xpForNext} XP
          </span>
        </div>

        {/* Progress track */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background:
                'linear-gradient(90deg, #FFC857 0%, #FFD98A 50%, #FFC857 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}
