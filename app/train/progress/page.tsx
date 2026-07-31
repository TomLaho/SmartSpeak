'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LockClosedIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { DIMENSION_LABELS, BENCHMARKS, getExercise, type Dimension } from '@/lib/exercises';
import {
  loadProgress,
  dimensionTrend,
  type Progress,
} from '@/lib/local-store';
import { ACHIEVEMENTS, loadUnlockedAchievements, loadUnlockedIds, type Achievement } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import { Ring } from '@/components/train/ring';
import { LevelBar } from '@/components/train/level-bar';
import { Sparkline } from '@/components/train/sparkline';
import { ActivityStrip } from '@/components/train/activity-strip';

const MEASURABLE_DIMS: Dimension[] = [
  'pace',
  'pauses',
  'intonation',
  'energy',
  'fillers',
  'hook',
  'structure',
  'clarity',
  'concreteness',
];

/** Recent window size for the headline average and its comparison period. */
const WINDOW = 6;

export default function ProgressPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setUnlockedAchievements(loadUnlockedAchievements());
    setUnlockedIds(loadUnlockedIds());
  }, []);

  const history = progress?.history ?? [];
  const recent = history.slice(0, 12);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

  // Headline average over the last WINDOW takes, compared with the WINDOW
  // before it — an average with no direction attached says nothing about
  // whether the training is working.
  const currentWindow = history.slice(0, WINDOW).map((h) => h.score);
  const priorWindow = history.slice(WINDOW, WINDOW * 2).map((h) => h.score);
  const avgScore = avg(currentWindow);
  const delta = priorWindow.length >= 2 ? avgScore - avg(priorWindow) : null;

  const bestScore = history.length ? Math.max(...history.map((h) => h.score)) : 0;
  const completed = progress ? Object.values(progress.exercises).filter((e) => e.attempts > 0).length : 0;

  // Dimensions with at least 2 data points
  const trendDims = MEASURABLE_DIMS.filter((dim) => {
    if (!progress) return false;
    return dimensionTrend(progress, dim).length >= 2;
  });

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Your progress</h1>

      {/* Level bar */}
      <div className="mb-4 rounded-2xl border border-hairline bg-surface-1 px-4 py-3">
        <LevelBar xp={progress?.xp ?? 0} />
      </div>

      {/* Habit, as a shape rather than a number */}
      <ActivityStrip history={history} className="mb-4" />

      {/* Headline: average with direction, paired with the supporting numbers.
          Two columns of different things beats a row of identical KPI cards. */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-hairline bg-surface-2 p-4">
          <Ring value={avgScore} size={86} stroke={9} color="#FFC857">
            <span className="text-xl font-bold tabular-nums">{avgScore || '—'}</span>
          </Ring>
          <p className="mt-2.5 text-center text-xs font-semibold text-white/70">Recent average</p>
          {delta === null ? (
            <p className="mt-0.5 text-center text-[11px] text-white/35">
              {recent.length ? `Last ${currentWindow.length} takes` : 'No takes yet'}
            </p>
          ) : (
            <p
              className={cn(
                'mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
                delta > 0 ? 'text-stage' : delta < 0 ? 'text-tier-amber' : 'text-white/40'
              )}
            >
              {delta > 0 && <ArrowUpRightIcon className="h-3 w-3" />}
              {delta < 0 && <ArrowDownRightIcon className="h-3 w-3" />}
              {delta === 0 ? 'Holding steady' : `${delta > 0 ? '+' : ''}${delta} vs previous`}
            </p>
          )}
        </div>

        <div className="grid grid-rows-3 gap-3">
          <MiniStat value={(progress?.streak ?? 0).toString()} label="Day streak" />
          <MiniStat value={bestScore ? bestScore.toString() : '—'} label="Best score" />
          <MiniStat value={completed.toString()} label="Exercises done" />
        </div>
      </div>

      {/* Dimension trends */}
      {trendDims.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Dimension trends</h2>
          <div className="mb-6 space-y-2">
            {trendDims.map((dim) => {
              const values = progress ? dimensionTrend(progress, dim) : [];
              const last = values[values.length - 1] ?? 0;
              const first = values[0] ?? 0;
              const dimDelta = values.length >= 2 ? last - first : 0;
              const benchmark = BENCHMARKS[dim];
              return (
                <div
                  key={dim}
                  className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-1 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{DIMENSION_LABELS[dim]}</p>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {dimDelta !== 0 && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold tabular-nums',
                              dimDelta > 0 ? 'text-stage' : 'text-white/30'
                            )}
                          >
                            {dimDelta > 0 ? '+' : ''}
                            {dimDelta}
                          </span>
                        )}
                        <span className="text-sm font-bold text-spotlight tabular-nums">{last}</span>
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/35">Target: {benchmark.target}</p>
                  </div>
                  <Sparkline values={values} width={72} height={28} color="#FFC857" />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Achievements grid */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">Achievements</h2>
        <span className="text-xs text-white/35 tabular-nums">
          {unlockedAchievements.length}/{ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const earned = unlockedIds.has(a.id);
          return (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl border p-3.5',
                earned ? 'border-spotlight/30 bg-spotlight/10' : 'border-hairline bg-surface-1 opacity-60'
              )}
            >
              {earned ? (
                <span className="text-2xl">{a.emoji}</span>
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                  <LockClosedIcon className="h-4 w-4 text-white/35" />
                </span>
              )}
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold leading-tight', earned ? 'text-white' : 'text-white/50')}>
                  {a.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/40 line-clamp-2">{a.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent takes */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Recent takes</h2>
      {recent.length === 0 ? (
        <div className="rounded-2xl border border-hairline bg-surface-1 p-6 text-center text-sm text-white/50">
          No takes yet.
          <div className="mt-3">
            <Link href="/train" className="inline-flex items-center gap-1 font-semibold text-spotlight">
              Start your first exercise
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((h) => {
            const ex = getExercise(h.exerciseId);
            const color = h.score >= 80 ? '#4ade80' : h.score >= 60 ? '#FFC857' : '#f87171';
            return (
              <div key={h.id} className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-1 p-3">
                <span className="text-xl">{ex?.emoji ?? '🎤'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{ex?.title ?? 'Exercise'}</p>
                  <p className="text-xs text-white/45">
                    {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · +{h.xp} XP
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums" style={{ color }}>
                  {h.score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface-1 px-3.5">
      <p className="text-[11px] text-white/45">{label}</p>
      <p className="text-lg font-bold leading-none tabular-nums tracking-display">{value}</p>
    </div>
  );
}
