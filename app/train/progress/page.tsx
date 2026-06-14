'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EXERCISES, DIMENSION_LABELS, BENCHMARKS, getExercise, type Dimension } from '@/lib/exercises';
import {
  loadProgress,
  dimensionTrend,
  type Progress,
} from '@/lib/local-store';
import { ACHIEVEMENTS, loadUnlockedAchievements, loadUnlockedIds, type Achievement } from '@/lib/achievements';
import { Ring } from '@/components/train/ring';
import { LevelBar } from '@/components/train/level-bar';
import { Sparkline } from '@/components/train/sparkline';

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

  const completed = progress ? Object.values(progress.exercises).filter((e) => e.attempts > 0).length : 0;
  const recent = progress?.history.slice(0, 12) ?? [];
  const avgScore = recent.length ? Math.round(recent.reduce((a, h) => a + h.score, 0) / recent.length) : 0;

  // Dimensions with at least 2 data points
  const trendDims = MEASURABLE_DIMS.filter((dim) => {
    if (!progress) return false;
    return dimensionTrend(progress, dim).length >= 2;
  });

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Your progress</h1>

      {/* Level bar */}
      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <LevelBar xp={progress?.xp ?? 0} />
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Tile value={(progress?.streak ?? 0).toString()} label="Day streak" emoji="🔥" />
        <Tile value={(progress?.xp ?? 0).toLocaleString()} label="Total XP" emoji="⚡" />
        <Tile value={`${completed}/${EXERCISES.length}`} label="Exercises" emoji="✅" />
      </div>

      {/* Recent average score ring */}
      <div className="mb-6 flex items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
        <Ring value={avgScore} size={92} stroke={9} color="#FFC857">
          <span className="text-xl font-bold">{avgScore || '—'}</span>
        </Ring>
        <div>
          <p className="font-semibold">Recent average score</p>
          <p className="mt-0.5 text-sm text-white/55">
            {recent.length ? `Across your last ${recent.length} takes.` : 'Complete a take to see your average.'}
          </p>
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
              const benchmark = BENCHMARKS[dim];
              return (
                <div
                  key={dim}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{DIMENSION_LABELS[dim]}</p>
                      <span className="shrink-0 text-sm font-bold text-spotlight tabular-nums">{last}</span>
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Achievements</h2>
      <div className="mb-6 grid grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const earned = unlockedIds.has(a.id);
          return (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl border p-3.5',
                earned
                  ? 'border-spotlight/30 bg-spotlight/10'
                  : 'border-white/8 bg-white/[0.03] opacity-60'
              )}
            >
              <span className="text-2xl">{earned ? a.emoji : '🔒'}</span>
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-white/50">
          No takes yet.
          <div className="mt-3">
            <Link href="/train" className="font-semibold text-spotlight">
              Start your first exercise →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((h) => {
            const ex = getExercise(h.exerciseId);
            const color = h.score >= 80 ? '#4ade80' : h.score >= 60 ? '#FFC857' : '#f87171';
            return (
              <div key={h.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
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

function Tile({ value, label, emoji }: { value: string; label: string; emoji: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-center">
      <div className="text-xl">{emoji}</div>
      <p className="mt-1 text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-white/45">{label}</p>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
