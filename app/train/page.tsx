'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DAILY_GOAL_XP,
  EXERCISES,
  TRACKS,
  exercisesByTrack,
  nextExercise,
  type Exercise,
  type TrackId,
} from '@/lib/exercises';
import { loadProgress, type Progress } from '@/lib/local-store';
import { loadCalibration, isCalibrationNudgeDismissed, dismissCalibrationNudge } from '@/lib/calibration';
import { Ring } from '@/components/train/ring';
import { LogoMark } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

export default function TrainHome() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showCalNudge, setShowCalNudge] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setShowCalNudge(!loadCalibration() && !isCalibrationNudgeDismissed());
  }, []);

  const goalPct = progress ? Math.min(100, (progress.todayXp / DAILY_GOAL_XP) * 100) : 0;
  const goalDone = (progress?.todayXp ?? 0) >= DAILY_GOAL_XP;

  const attempted = (id: string) => (progress?.exercises[id]?.attempts ?? 0) > 0;
  const allDone = progress ? EXERCISES.every((e) => attempted(e.id)) : false;
  const upNext = nextExercise(attempted);
  const started = progress ? Object.values(progress.exercises).some((e) => e.attempts > 0) : false;

  return (
    <div className="px-5 pb-8 pt-5">
      {/* App bar */}
      <div className="mb-6 flex items-center justify-between">
        <LogoMark size={30} className="rounded-[22%]" />
        <div className="flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1.5 text-orange-300">
          <span className="text-lg">🔥</span>
          <span className="font-bold">{progress?.streak ?? 0}</span>
          <span className="text-xs text-orange-300/70">day{(progress?.streak ?? 0) === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Daily goal */}
      <div className="mb-5 flex items-center gap-5 rounded-3xl border border-white/10 bg-white/5 p-5">
        <Ring value={goalPct} size={88} stroke={9} color={goalDone ? '#22c55e' : '#7c3aed'}>
          <span className="text-lg font-bold">{progress?.todayXp ?? 0}</span>
          <span className="text-[10px] text-white/50">/ {DAILY_GOAL_XP} XP</span>
        </Ring>
        <div className="flex-1">
          <p className="font-semibold">{goalDone ? 'Daily goal complete! 🎉' : 'Today’s goal'}</p>
          <p className="mt-0.5 text-sm text-white/55">
            {goalDone
              ? 'Nice work. Come back tomorrow to keep your streak alive.'
              : 'One short rep gets you there — and grows your streak.'}
          </p>
          <p className="mt-2 text-xs text-white/40">{(progress?.xp ?? 0).toLocaleString()} XP total</p>
        </div>
      </div>

      {/* Mic calibration nudge (dismissible, one-time) */}
      {showCalNudge && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <span className="text-lg">🎚️</span>
          <p className="flex-1 text-sm text-white/70">Calibrate your mic (2s) for sharper, room-aware feedback.</p>
          <Link
            href="/train/profile"
            className="shrink-0 rounded-full bg-violet-500 px-3 py-1.5 text-xs font-semibold"
          >
            Calibrate
          </Link>
          <button
            onClick={() => {
              dismissCalibrationNudge();
              setShowCalNudge(false);
            }}
            aria-label="Dismiss"
            className="shrink-0 px-1 text-white/30 hover:text-white/60"
          >
            ✕
          </button>
        </div>
      )}

      {/* Up next — primary action */}
      <Link
        href={`/train/exercise/${upNext.id}`}
        className="mb-8 block rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-600/25 to-blue-600/20 p-5 transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">
            {allDone ? 'Sharpen up' : started ? 'Continue' : 'Start here'}
          </p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">{upNext.scenario}</span>
        </div>
        <div className="mt-2 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">
            {upNext.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight">{upNext.title}</p>
            <p className="truncate text-sm text-white/60">
              {allDone ? 'Replay to beat your best score.' : upNext.summary}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold">Go</span>
        </div>
      </Link>

      {/* Skill paths */}
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
        <div className="mt-1 flex items-center gap-1.5">
          <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">{exercise.scenario}</span>
          <p className="truncate text-xs text-white/45">{exercise.summary}</p>
        </div>
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
