'use client';

import { dayKey, type AttemptRecord } from '@/lib/local-store';
import { cn } from '@/lib/utils';

/**
 * Last-N-days practice strip.
 *
 * A streak number tells you where you are; the strip tells you what your habit
 * actually looks like — which days you miss, whether you're building or fading.
 * One shaded column per day beats another number tile: same footprint, far more
 * information, and the gaps are the part that changes behaviour.
 */
export function ActivityStrip({
  history,
  days = 14,
  className,
}: {
  history: AttemptRecord[];
  days?: number;
  className?: string;
}) {
  const today = new Date();
  const columns = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const key = dayKey(d);
    const reps = history.filter((h) => dayKey(new Date(h.date)) === key).length;
    return { key, reps, isToday: i === days - 1, date: d };
  });

  const max = Math.max(1, ...columns.map((c) => c.reps));
  const activeDays = columns.filter((c) => c.reps > 0).length;

  return (
    <div className={cn('rounded-3xl border border-hairline bg-surface-2 p-4', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">Last {days} days</p>
        <p className="text-xs text-white/45">
          <span className="font-semibold text-white/75 tabular-nums">{activeDays}</span> day
          {activeDays === 1 ? '' : 's'} practised
        </p>
      </div>

      <div className="mt-3 flex h-12 items-end gap-[3px]">
        {columns.map((c) => {
          // Even a single rep gets a visible column — an empty day and a light
          // day must never look the same.
          const heightPct = c.reps === 0 ? 12 : 30 + (c.reps / max) * 70;
          return (
            <div
              key={c.key}
              title={`${c.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${c.reps} rep${
                c.reps === 1 ? '' : 's'
              }`}
              className={cn(
                // A small radius, not a pill: at 14 columns each bar is wide
                // enough that `rounded-full` turns it into a lozenge.
                'min-w-0 flex-1 rounded-[3px] transition-all',
                c.reps > 0 ? 'bg-spotlight' : 'bg-white/[0.09]',
                c.isToday && c.reps === 0 && 'ring-1 ring-inset ring-spotlight/40'
              )}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] text-white/30">
        <span>{days} days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
