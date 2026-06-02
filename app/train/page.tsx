'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DAILY_GOAL_XP,
  TRACKS,
  exercisesByTrack,
  type Exercise,
  type TrackId,
} from '@/lib/exercises';
import { loadProgress, type Progress } from '@/lib/local-store';
import { Ring } from '@/components/train/ring';
import { cn } from '@/lib/utils';

export default function TrainHome() {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const goalPct = progress ? Math.min(100, (progress.todayXp / DAILY_GOAL_XP) * 100) : 0;
  const goalDone = (progress?.todayXp ?? 0) >= DAILY_GOAL_XP;

  return (
    <div className="px-5 pb-8 pt-6">
      {/* Top stats bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Today&apos;s workout</p>
          <h1 className="text-2xl font-bold">5 minutes to a better voice</h1>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1.5 text-orange-300">
          <span className="text-lg">🔥</span>
          <span className="font-bold">{progress?.streak ?? 0}</span>
        </div>
      </div>

      {/* Daily goal */}
      <div className="mb-8 flex items-center gap-5 rounded-3xl border border-white/10 bg-white/5 p-5">
        <Ring value={goalPct} size={92} stroke={9} color={goalDone ? '#22c55e' : '#7c3aed'}>
          <span className="text-lg font-bold">{progress?.todayXp ?? 0}</span>
          <span className="text-[10px] text-white/50">/ {DAILY_GOAL_XP} XP</span>
        </Ring>
        <div className="flex-1">
          <p className="font-semibold">{goalDone ? 'Daily goal complete! 🎉' : 'Daily goal'}</p>
          <p className="mt-0.5 text-sm text-white/55">
            {goalDone
              ? 'Nice work. Come back tomorrow to keep your streak alive.'
              : 'Finish one or two exercises to hit your goal and grow your streak.'}
          </p>
          <p className="mt-2 text-xs text-white/40">{(progress?.xp ?? 0).toLocaleString()} XP total</p>
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-9">
        {(Object.keys(TRACKS) as TrackId[]).map((trackId) => (
          <TrackPath key={trackId} trackId={trackId} progress={progress} />
        ))}
      </div>
    </div>
  );
}

function TrackPath({ trackId, progress }: { trackId: TrackId; progress: Progress | null }) {
  const track = TRACKS[trackId];
  const exercises = useMemo(() => exercisesByTrack(trackId), [trackId]);

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xl', track.gradient)}>
          {track.emoji}
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight">{track.name}</h2>
          <p className="text-xs text-white/50">{track.tagline}</p>
        </div>
      </div>

      <div className="relative space-y-2.5">
        {exercises.map((exercise, i) => {
          const prev = exercises[i - 1];
          const prevDone = !prev || (progress?.exercises[prev.id]?.attempts ?? 0) > 0;
          const state = progress
            ? (progress.exercises[exercise.id]?.attempts ?? 0) > 0
              ? 'done'
              : prevDone
              ? 'open'
              : 'locked'
            : 'open';
          return (
            <PathNode
              key={exercise.id}
              exercise={exercise}
              accent={track.accent}
              state={state as NodeState}
              best={progress?.exercises[exercise.id]?.bestScore}
            />
          );
        })}
      </div>
    </section>
  );
}

type NodeState = 'done' | 'open' | 'locked';

function PathNode({
  exercise,
  accent,
  state,
  best,
}: {
  exercise: Exercise;
  accent: string;
  state: NodeState;
  best?: number;
}) {
  const locked = state === 'locked';
  const content = (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border p-3.5 transition-colors',
        locked
          ? 'border-white/5 bg-white/[0.02] opacity-55'
          : 'border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.99]'
      )}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{ backgroundColor: state === 'done' ? accent : 'rgba(255,255,255,0.06)' }}
      >
        {locked ? '🔒' : state === 'done' ? '✓' : exercise.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{exercise.title}</p>
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
            Lv {exercise.level}
          </span>
        </div>
        <p className="truncate text-xs text-white/50">{exercise.summary}</p>
      </div>
      {state === 'done' && typeof best === 'number' && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold" style={{ color: accent }}>
            {best}
          </p>
          <p className="text-[10px] text-white/40">best</p>
        </div>
      )}
      {state === 'open' && <span className="shrink-0 text-white/30">›</span>}
    </div>
  );

  if (locked) return content;
  return <Link href={`/train/exercise/${exercise.id}`}>{content}</Link>;
}
