'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  EXERCISES,
  TRACKS,
  exercisesByTrack,
  type Exercise,
  type TrackId,
} from '@/lib/exercises';
import {
  loadProgress,
  loadDailyGoalReps,
  repsToday,
  type Progress,
} from '@/lib/local-store';
import { loadCalibration, isCalibrationNudgeDismissed, dismissCalibrationNudge } from '@/lib/calibration';
import {
  isProCached,
  refreshEntitlement,
  canAccessExercise,
  FREE_EXERCISE_LIMIT,
  PRO_PRICE,
} from '@/lib/entitlement';
import { recommendNext } from '@/lib/selection';
import { masteryGateMessage, isMastered } from '@/lib/selection';
import { loadUnlockedAchievements, ACHIEVEMENTS } from '@/lib/achievements';
import { Ring } from '@/components/train/ring';
import { LevelBar } from '@/components/train/level-bar';
import { LogoMark } from '@/components/brand/logo';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/lib/achievements';

const ONBOARDING_KEY = 'smartspeak.onboarded.v1';

export default function TrainHome() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showCalNudge, setShowCalNudge] = useState(false);
  const [pro, setPro] = useState(false);
  const [dailyGoalReps, setDailyGoalReps] = useState(1);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setShowCalNudge(!loadCalibration() && !isCalibrationNudgeDismissed());
    setPro(isProCached());
    refreshEntitlement().then(setPro);
    setDailyGoalReps(loadDailyGoalReps());
    setUnlockedAchievements(loadUnlockedAchievements());

    // First-run onboarding: show if flag not set AND no history
    const onboarded = typeof window !== 'undefined'
      ? window.localStorage.getItem(ONBOARDING_KEY)
      : '1';
    if (!onboarded && p.history.length === 0) {
      setShowOnboarding(true);
    }
  }, []);

  const repsCompletedToday = progress ? repsToday(progress) : 0;
  const goalDone = repsCompletedToday >= dailyGoalReps;
  const goalPct = Math.min(100, (repsCompletedToday / Math.max(1, dailyGoalReps)) * 100);

  const attempted = (id: string) => (progress?.exercises[id]?.attempts ?? 0) > 0;
  const distinctAttempted = progress
    ? Object.values(progress.exercises).filter((e) => e.attempts > 0).length
    : 0;
  const allDone = progress ? EXERCISES.every((e) => attempted(e.id)) : false;

  // Use recommendNext when we have progress history, fall back gracefully
  const recommended = progress && progress.history.length > 0
    ? recommendNext(progress)
    : null;
  const upNext = recommended?.exercise ?? EXERCISES.find((e) => !attempted(e.id)) ?? EXERCISES[0];
  const upNextReason = recommended?.reason ?? null;

  const started = distinctAttempted > 0;
  const upNextAccessible = canAccessExercise({
    pro,
    alreadyAttempted: attempted(upNext.id),
    distinctAttempted,
  });

  const lockedCount = ACHIEVEMENTS.length - unlockedAchievements.length;

  function dismissOnboarding() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_KEY, '1');
    }
    setShowOnboarding(false);
  }

  function startFirstRep() {
    dismissOnboarding();
    router.push(`/train/exercise/${upNext.id}`);
  }

  return (
    <div className="px-5 pb-8 pt-5">
      {/* First-run onboarding overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
          <div className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0f0e0c] p-6 pb-8 sm:rounded-3xl">
            <button
              onClick={dismissOnboarding}
              aria-label="Skip intro"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/80"
            >
              ✕
            </button>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-spotlight/15">
              <span className="text-2xl">🎙️</span>
            </div>
            <h2 className="mb-4 text-xl font-bold leading-snug">
              Build the habit in 1 minute a day
            </h2>
            <ul className="mb-6 space-y-3">
              {[
                { emoji: '⏱️', text: '1-minute reps for real work moments' },
                { emoji: '🔒', text: 'Private on-device analysis of pace, pauses, energy & words' },
                { emoji: '🏆', text: 'Build a streak, earn your level, unlock achievements' },
              ].map(({ emoji, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="mt-0.5 shrink-0 text-base">{emoji}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={startFirstRep}
              className="block w-full rounded-2xl bg-spotlight py-3.5 text-center text-sm font-bold text-ink transition-opacity active:opacity-80"
            >
              Start my first rep
            </button>
          </div>
        </div>
      )}

      {/* App bar */}
      <div className="mb-4 flex items-center justify-between">
        <LogoMark size={30} className="rounded-[22%]" />
        <div className="flex items-center gap-1.5 rounded-full bg-spotlight/15 px-3 py-1.5 text-spotlight">
          <span className="text-lg">🔥</span>
          <span className="font-bold">{progress?.streak ?? 0}</span>
          <span className="text-xs text-spotlight/70">day{(progress?.streak ?? 0) === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Level bar — status / identity */}
      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <LevelBar xp={progress?.xp ?? 0} />
      </div>

      {/* Daily goal — rep-based */}
      <div className="mb-5 flex items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
        <Ring value={goalPct} size={88} stroke={9} color={goalDone ? '#4ade80' : '#FFC857'} animate>
          <span className="text-lg font-bold">{repsCompletedToday}</span>
          <span className="text-[10px] text-white/50">/ {dailyGoalReps} rep{dailyGoalReps === 1 ? '' : 's'}</span>
        </Ring>
        <div className="flex-1">
          <p className="font-semibold">
            {goalDone ? 'Daily goal complete!' : "Today's goal"}
          </p>
          <p className="mt-0.5 text-sm text-white/55">
            {goalDone
              ? 'Great work. Come back tomorrow to keep your streak alive.'
              : `${dailyGoalReps - repsCompletedToday} more rep${dailyGoalReps - repsCompletedToday === 1 ? '' : 's'} to hit your goal.`}
          </p>
          <p className="mt-2 text-xs text-white/40">{(progress?.xp ?? 0).toLocaleString()} XP total</p>
        </div>
      </div>

      {/* Mic calibration nudge (dismissible, one-time) */}
      {showCalNudge && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
          <span className="text-lg">🎚️</span>
          <p className="flex-1 text-sm text-white/70">Calibrate your mic (2s) for sharper, room-aware feedback.</p>
          <Link
            href="/train/profile"
            className="shrink-0 rounded-full bg-spotlight px-3 py-1.5 text-xs font-semibold text-ink"
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

      {/* Up next */}
      {upNextAccessible ? (
        <Link
          href={`/train/exercise/${upNext.id}`}
          className="mb-5 block rounded-3xl border border-spotlight/30 bg-gradient-to-br from-spotlight/20 to-spotlight/5 p-5 transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-spotlight">
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
              {upNextReason && (
                <p className="mt-1 text-xs text-spotlight/80">{upNextReason}</p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-spotlight px-4 py-2 text-sm font-semibold text-ink">Go</span>
          </div>
        </Link>
      ) : (
        <Link
          href="/train/unlock"
          className="mb-5 block rounded-3xl border border-spotlight/30 bg-gradient-to-br from-spotlight/20 to-spotlight/5 p-5 transition-transform active:scale-[0.99]"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-spotlight">SmartSpeak Pro</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">🔓</div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-tight">Unlock all reps</p>
              <p className="truncate text-sm text-white/60">
                You&apos;ve used your {FREE_EXERCISE_LIMIT} free reps — keep training for {PRO_PRICE}.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-spotlight px-4 py-2 text-sm font-semibold text-ink">{PRO_PRICE}</span>
          </div>
        </Link>
      )}

      {/* Free-preview progress (gentle conversion nudge) */}
      {!pro && distinctAttempted < FREE_EXERCISE_LIMIT && (
        <Link
          href="/train/unlock"
          className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
        >
          <p className="text-sm text-white/70">
            🔓 Free preview ·{' '}
            <span className="font-semibold text-white/90">
              {distinctAttempted}/{FREE_EXERCISE_LIMIT}
            </span>{' '}
            free reps used
          </p>
          <span className="shrink-0 rounded-full bg-spotlight px-3 py-1.5 text-xs font-semibold text-ink">
            Unlock {PRO_PRICE}
          </span>
        </Link>
      )}

      {/* Achievements shelf */}
      <div className="mb-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">Achievements</h2>
          <Link href="/train/progress" className="text-xs text-spotlight/70 hover:text-spotlight">
            See all
          </Link>
        </div>
        {unlockedAchievements.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="text-xl">🏅</span>
            <p className="text-sm text-white/50">
              Complete your first rep to earn your first badge.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {unlockedAchievements.map((a) => (
              <div
                key={a.id}
                title={`${a.name}: ${a.description}`}
                className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border border-spotlight/30 bg-spotlight/10 px-3 py-2.5"
              >
                <span className="text-xl">{a.emoji}</span>
                <span className="text-[10px] font-medium text-spotlight/80 whitespace-nowrap">{a.name}</span>
              </div>
            ))}
            {lockedCount > 0 && (
              <Link
                href="/train/progress"
                className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
              >
                <span className="text-xl">🔒</span>
                <span className="text-[10px] text-white/35 whitespace-nowrap">{lockedCount} more</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Skill paths */}
      <div className="space-y-9">
        {(Object.keys(TRACKS) as TrackId[]).map((trackId) => (
          <TrackPath
            key={trackId}
            trackId={trackId}
            progress={progress}
            pro={pro}
            distinctAttempted={distinctAttempted}
          />
        ))}
      </div>
    </div>
  );
}

function TrackPath({
  trackId,
  progress,
  pro,
  distinctAttempted,
}: {
  trackId: TrackId;
  progress: Progress | null;
  pro: boolean;
  distinctAttempted: number;
}) {
  const track = TRACKS[trackId];
  const exercises = useMemo(() => exercisesByTrack(trackId), [trackId]);
  const gateMsg = progress ? masteryGateMessage(progress, trackId) : null;

  return (
    <section>
      <div className="mb-1 flex items-center gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xl', track.gradient)}>
          {track.emoji}
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight">{track.name}</h2>
          <p className="text-xs text-white/50">{track.tagline}</p>
        </div>
      </div>

      {/* Mastery gate hint */}
      {gateMsg && (
        <p className="mb-3 mt-1 pl-14 text-xs text-white/35">{gateMsg}</p>
      )}
      {!gateMsg && <div className="mb-4" />}

      <div className="relative space-y-2.5">
        {exercises.map((exercise, i) => {
          const prev = exercises[i - 1];
          const prevDone = !prev || (progress?.exercises[prev.id]?.attempts ?? 0) > 0;
          const isAttempted = (progress?.exercises[exercise.id]?.attempts ?? 0) > 0;
          const mastered = progress ? isMastered(progress, exercise.id) : false;
          let state: NodeState = progress ? (isAttempted ? 'done' : prevDone ? 'open' : 'locked') : 'open';
          if (state === 'open' && !canAccessExercise({ pro, alreadyAttempted: isAttempted, distinctAttempted })) {
            state = 'pro';
          }
          return (
            <PathNode
              key={exercise.id}
              exercise={exercise}
              accent={track.accent}
              state={state}
              best={progress?.exercises[exercise.id]?.bestScore}
              mastered={mastered}
            />
          );
        })}
      </div>
    </section>
  );
}

type NodeState = 'done' | 'open' | 'locked' | 'pro';

function PathNode({
  exercise,
  accent,
  state,
  best,
  mastered,
}: {
  exercise: Exercise;
  accent: string;
  state: NodeState;
  best?: number;
  mastered?: boolean;
}) {
  const locked = state === 'locked';
  const isPro = state === 'pro';
  const isDone = state === 'done';

  const content = (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border p-3.5 transition-colors',
        locked
          ? 'border-white/5 bg-white/[0.02] opacity-55'
          : isPro
          ? 'border-spotlight/20 bg-white/[0.05] hover:bg-white/[0.08] active:scale-[0.99]'
          : 'border-white/10 bg-white/[0.05] hover:bg-white/[0.08] active:scale-[0.99]'
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl',
          isDone && mastered ? 'ring-2 ring-spotlight/60' : ''
        )}
        style={{ backgroundColor: isDone ? accent : 'rgba(255,255,255,0.06)' }}
      >
        {locked ? '🔒' : isDone && mastered ? '✦' : isDone ? '✓' : exercise.emoji}
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
      {isDone && typeof best === 'number' && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold" style={{ color: mastered ? '#FFC857' : accent }}>
            {best}
          </p>
          <p className="text-[10px] text-white/40">best</p>
        </div>
      )}
      {state === 'open' && <span className="shrink-0 text-white/30">›</span>}
      {isPro && (
        <span className="shrink-0 rounded-full bg-spotlight/20 px-2.5 py-1 text-[10px] font-bold text-spotlight">
          PRO
        </span>
      )}
    </div>
  );

  if (locked) return content;
  return <Link href={isPro ? '/train/unlock' : `/train/exercise/${exercise.id}`}>{content}</Link>;
}
