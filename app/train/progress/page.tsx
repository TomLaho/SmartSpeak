'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EXERCISES, getExercise } from '@/lib/exercises';
import { loadProgress, type Progress } from '@/lib/local-store';
import { Ring } from '@/components/train/ring';

export default function ProgressPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => setProgress(loadProgress()), []);

  const completed = progress ? Object.values(progress.exercises).filter((e) => e.attempts > 0).length : 0;
  const recent = progress?.history.slice(0, 12) ?? [];
  const avgScore = recent.length ? Math.round(recent.reduce((a, h) => a + h.score, 0) / recent.length) : 0;

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="mb-5 text-2xl font-bold">Your progress</h1>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Tile value={(progress?.streak ?? 0).toString()} label="Day streak" emoji="🔥" />
        <Tile value={(progress?.xp ?? 0).toLocaleString()} label="Total XP" emoji="⚡" />
        <Tile value={`${completed}/${EXERCISES.length}`} label="Exercises" emoji="✅" />
      </div>

      <div className="mb-6 flex items-center gap-5 rounded-3xl border border-white/10 bg-white/5 p-5">
        <Ring value={avgScore} size={92} stroke={9} color="#7c3aed">
          <span className="text-xl font-bold">{avgScore || '—'}</span>
        </Ring>
        <div>
          <p className="font-semibold">Recent average score</p>
          <p className="mt-0.5 text-sm text-white/55">
            {recent.length ? `Across your last ${recent.length} takes.` : 'Complete a take to see your average.'}
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Recent takes</h2>
      {recent.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
          No takes yet.
          <div className="mt-3">
            <Link href="/train" className="font-semibold text-violet-300">
              Start your first exercise →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((h) => {
            const ex = getExercise(h.exerciseId);
            const color = h.score >= 80 ? '#22c55e' : h.score >= 60 ? '#7c3aed' : '#f59e0b';
            return (
              <div key={h.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <span className="text-xl">{ex?.emoji ?? '🎤'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{ex?.title ?? 'Exercise'}</p>
                  <p className="text-xs text-white/45">
                    {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · +{h.xp} XP
                  </p>
                </div>
                <span className="text-lg font-bold" style={{ color }}>
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <div className="text-xl">{emoji}</div>
      <p className="mt-1 text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-white/45">{label}</p>
    </div>
  );
}
