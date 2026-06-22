'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  EXERCISES,
  MODULES,
  FREE_PLAY_ID,
  FREE_PLAY,
  type ModuleId,
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
  canAccessFreePlay,
  isModuleUnlocked,
  FREE_EXERCISE_LIMIT,
  PRO_PRICE,
} from '@/lib/entitlement';
import { recommendNext, moduleProgress } from '@/lib/selection';
import { Ring } from '@/components/train/ring';
import { LevelBar } from '@/components/train/level-bar';
import { LogoMark } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'smartspeak.onboarded.v1';

export default function TrainHome() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showCalNudge, setShowCalNudge] = useState(false);
  const [pro, setPro] = useState(false);
  const [dailyGoalReps, setDailyGoalReps] = useState(1);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setShowCalNudge(!loadCalibration() && !isCalibrationNudgeDismissed());
    setPro(isProCached());
    refreshEntitlement().then(setPro);
    setDailyGoalReps(loadDailyGoalReps());

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
  // Exclude FREE_PLAY_ID so a free-play rep never burns a preview slot.
  const distinctAttempted = progress
    ? Object.entries(progress.exercises).filter(([id, e]) => e.attempts > 0 && id !== FREE_PLAY_ID).length
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
          <p className="flex-1 text-sm text-white/70">Calibrate your mic (2s) to tune volume feedback to your voice.</p>
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

      {/* Learning Modules */}
      <div className="mb-7">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Learning Modules</h2>
        <div className="space-y-3">
          {MODULES.map((module) => {
            const unlocked = isModuleUnlocked({ pro, order: module.order });
            if (!unlocked) {
              // Locked module — visible curiosity gap pointing at the Pro unlock.
              return (
                <Link
                  key={module.id}
                  href="/train/unlock"
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07] active:scale-[0.99]"
                >
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl opacity-50', module.gradient)}>
                    {module.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold leading-tight text-white/80">{module.name}</p>
                      <span className="shrink-0 rounded-full bg-spotlight/15 px-2 py-0.5 text-[10px] font-bold text-spotlight">
                        🔒 PRO
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/45">{module.blurb}</p>
                    <p className="mt-1 text-[10px] font-semibold text-spotlight/80">Unlock · {PRO_PRICE}</p>
                  </div>
                  <span className="shrink-0 text-white/30">›</span>
                </Link>
              );
            }
            const mp = progress ? moduleProgress(progress, module.id as ModuleId) : { pct: 0, started: false, masteredCount: 0, total: 0 };
            const statusLabel = mp.pct === 100 ? 'Mastered' : mp.started ? 'In progress' : 'Start module';
            return (
              <Link
                key={module.id}
                href={`/train/module/${module.id}`}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition-colors hover:bg-white/[0.08] active:scale-[0.99]"
              >
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl', module.gradient)}>
                  {module.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{module.name}</p>
                  <p className="mt-0.5 truncate text-xs text-white/50">{module.blurb}</p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${mp.pct}%`, backgroundColor: module.accent }}
                    />
                  </div>
                  <p className="mt-1 text-[10px]" style={{ color: mp.pct === 100 ? '#FFC857' : mp.started ? module.accent : 'rgba(255,255,255,0.35)' }}>
                    {statusLabel}
                  </p>
                </div>
                <span className="shrink-0 text-white/30">›</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Free Play — Open Mic */}
      {(() => {
        const freePlayAttempts = progress?.exercises[FREE_PLAY_ID]?.attempts ?? 0;
        const freePlayAccessible = canAccessFreePlay({ pro, freePlayAttempts });
        const href = freePlayAccessible ? `/train/exercise/${FREE_PLAY_ID}` : '/train/unlock';
        return (
          <Link
            href={href}
            className="mb-8 flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.08] active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
              {FREE_PLAY.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold leading-tight">{FREE_PLAY.title}</p>
                {freePlayAccessible && !pro && freePlayAttempts === 0 && (
                  <span className="rounded-full bg-spotlight/20 px-2 py-0.5 text-[10px] font-bold text-spotlight">
                    1 free
                  </span>
                )}
                {!freePlayAccessible && (
                  <span className="rounded-full bg-spotlight/20 px-2.5 py-1 text-[10px] font-bold text-spotlight">
                    PRO
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-white/50">Free Play — rehearse your own material, no rules.</p>
            </div>
            <span className="shrink-0 text-white/30">›</span>
          </Link>
        );
      })()}
    </div>
  );
}

