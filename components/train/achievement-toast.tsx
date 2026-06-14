'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

interface Achievement {
  name: string;
  emoji: string;
  description?: string;
}

interface AchievementToastProps {
  achievement: Achievement | null;
  onDone?: () => void;
  className?: string;
}

/**
 * Slides/pops in from the top when an achievement is unlocked.
 * Auto-dismisses after 2.8s. Fires haptic('celebrate') once on mount.
 * Safe to render always — renders nothing when achievement is null.
 */
export function AchievementToast({ achievement, onDone, className }: AchievementToastProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!achievement) {
      firedRef.current = false;
      return;
    }

    // Fire haptic once per achievement show.
    if (!firedRef.current) {
      firedRef.current = true;
      haptic('celebrate');
    }

    const timer = setTimeout(() => {
      onDone?.();
    }, 2800);

    return () => clearTimeout(timer);
  }, [achievement, onDone]);

  if (!achievement) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl px-5 py-3.5',
          'border border-spotlight/30 bg-ink-700 shadow-xl shadow-black/50',
          'animate-fade-up animate-pop',
          // Respect reduced-motion: the keyframes still run but the browser may reduce them.
          'motion-reduce:animate-none',
        )}
        style={{ minHeight: 56, maxWidth: 360 }}
      >
        {/* Emoji */}
        <span className="text-2xl leading-none" role="img" aria-hidden="true">
          {achievement.emoji}
        </span>

        {/* Text */}
        <div className="min-w-0">
          <p className="text-xs font-medium text-spotlight">Achievement unlocked</p>
          <p className="truncate text-sm font-semibold text-white">{achievement.name}</p>
          {achievement.description && (
            <p className="truncate text-xs text-white/50">{achievement.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
