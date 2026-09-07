'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FireIcon,
  ChevronRightIcon,
  XMarkIcon,
  LockClosedIcon,
  LockOpenIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
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
import { recommendNext, moduleProgress, moduleStatusLabel } from '@/lib/selection';
import { loadMoment, getMoment } from '@/lib/personalise';
import {
  setupState,
  isOnboarded,
  isReminderSet,
  isSetupDismissed,
  dismissSetup,
  type SetupState,
} from '@/lib/setup';
import { Ring } from '@/components/train/ring';
import { LevelBar } from '@/components/train/level-bar';
import { Onboarding } from '@/components/train/onboarding';
import { SetupChecklist } from '@/components/train/setup-checklist';
import { LogoMark } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

export default function TrainHome() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showCalNudge, setShowCalNudge] = useState(false);
  const [pro, setPro] = useState(false);
  const [dailyGoalReps, setDailyGoalReps] = useState(1);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [evening, setEvening] = useState(false);
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [goalModuleId, setGoalModuleId] = useState<ModuleId | null>(null);
  const [momentLabel, setMomentLabel] = useState<string | null>(null);

  /** Re-read every on-device flag the home screen renders from. */
  function syncFromStorage() {
    const p = loadProgress();
    setProgress(p);
    setShowCalNudge(!loadCalibration() && !isCalibrationNudgeDismissed());
    setDailyGoalReps(loadDailyGoalReps());

    const moment = getMoment(loadMoment());
    setGoalModuleId(moment?.moduleId ?? null);
    setMomentLabel(moment?.label ?? null);

    if (isSetupDismissed()) {
      setSetup(null);
    } else {
      // The step is only ever shown before the first rep, so "next" is simply
      // the first exercise they haven't touched — the same fallback the up-next
      // card uses before there's any history to reason from.
      const firstRep =
        EXERCISES.find((e) => (p.exercises[e.id]?.attempts ?? 0) === 0) ?? EXERCISES[0];
      setSetup(
        setupState({
          // The moment itself, not the onboarded flag: an account onboarded
          // before first-run asked this question has no moment to credit.
          goalChosen: loadMoment() !== null,
          totalReps: p.history.length,
          calibrated: loadCalibration() !== null,
          reminderSet: isReminderSet(),
          firstRepHref: `/train/exercise/${firstRep.id}`,
        })
      );
    }
    return p;
  }

  useEffect(() => {
    const p = syncFromStorage();
    setPro(isProCached());
    refreshEntitlement().then(setPro);
    setEvening(new Date().getHours() >= 17);

    // First-run: only for someone who has neither been through setup nor
    // recorded anything (a cleared flag on an active account must not re-ask).
    if (!isOnboarded() && p.history.length === 0) setShowOnboarding(true);
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
    ? recommendNext(progress, pro)
    : null;
  const upNext = recommended?.exercise ?? EXERCISES.find((e) => !attempted(e.id)) ?? EXERCISES[0];
  // Before there's any history to reason from, the reason is the user's own
  // stated goal — the first rep should visibly connect to what they signed up for.
  const upNextReason =
    recommended?.reason ?? (momentLabel ? `Groundwork for ${momentLabel.toLowerCase()}` : null);

  const started = distinctAttempted > 0;
  const upNextAccessible = canAccessExercise({
    pro,
    alreadyAttempted: attempted(upNext.id),
    distinctAttempted,
  });

  const setupVisible = setup !== null && !setup.complete;

  return (
    <div className="px-5 pb-8 pt-5">
      {showOnboarding && (
        <Onboarding
          onDone={() => {
            setShowOnboarding(false);
            syncFromStorage();
          }}
        />
      )}

      {/* App bar */}
      <div className="mb-4 flex items-center justify-between">
        <LogoMark size={30} className="rounded-[22%]" />
        <div className="flex items-center gap-1.5 rounded-full bg-spotlight/15 px-3 py-1.5 text-spotlight">
          <FireIcon className="h-4 w-4" />
          <span className="font-bold tabular-nums">{progress?.streak ?? 0}</span>
          <span className="text-xs text-spotlight/70">day{(progress?.streak ?? 0) === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Level bar — status / identity */}
      <div className="mb-5 rounded-2xl border border-hairline bg-surface-1 px-4 py-3">
        <LevelBar xp={progress?.xp ?? 0} />
      </div>

      {/* Daily goal — rep-based */}
      <div className="mb-5 flex items-center gap-5 rounded-3xl border border-hairline bg-surface-2 p-5">
        <Ring value={goalPct} size={88} stroke={9} color={goalDone ? '#4ade80' : '#FFC857'} animate>
          <span className="text-lg font-bold tabular-nums">{repsCompletedToday}</span>
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
          <p className="mt-2 text-xs text-white/40 tabular-nums">{(progress?.xp ?? 0).toLocaleString()} XP total</p>
        </div>
      </div>

      {/* First-week setup — starts part-filled, never at zero. */}
      {setupVisible && setup && (
        <SetupChecklist
          state={setup}
          onDismiss={() => {
            dismissSetup();
            setSetup(null);
          }}
        />
      )}

      {/* Streak-at-risk nudge: evening, active streak, nothing practised yet today */}
      {evening && (progress?.streak ?? 0) >= 2 && repsCompletedToday === 0 && (
        <Link
          href={upNextAccessible ? `/train/exercise/${upNext.id}` : '/train/unlock'}
          className="mb-5 flex items-center gap-3 rounded-2xl border border-tier-amber/25 bg-tier-amber/[0.07] p-3.5 transition-colors active:bg-tier-amber/10"
        >
          <FireIcon className="h-5 w-5 shrink-0 text-tier-amber" />
          <p className="flex-1 text-sm text-white/75">
            Your {progress?.streak ?? 0}-day streak ends tonight unless you do one 1-minute rep.
          </p>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/30" />
        </Link>
      )}

      {/* Mic calibration nudge (dismissible, one-time). Hidden while the setup
          checklist is up — it already carries calibration as a step. */}
      {showCalNudge && !setupVisible && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-hairline bg-surface-1 p-3.5">
          <AdjustmentsHorizontalIcon className="h-5 w-5 shrink-0 text-white/50" />
          <p className="flex-1 text-sm text-white/70">Calibrate your mic (2s) to tune volume feedback to your voice.</p>
          <Link
            href="/train/profile"
            className="shrink-0 rounded-full bg-spotlight px-3 py-1.5 text-xs font-semibold text-ink transition-transform active:scale-95"
          >
            Calibrate
          </Link>
          <button
            onClick={() => {
              dismissCalibrationNudge();
              setShowCalNudge(false);
            }}
            aria-label="Dismiss"
            className="shrink-0 px-1 text-white/30 transition-colors hover:text-white/60"
          >
            <XMarkIcon className="h-4 w-4" />
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
              <p className="text-lg font-bold leading-display tracking-display">{upNext.title}</p>
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
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <LockOpenIcon className="h-7 w-7 text-spotlight" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-display tracking-display">Unlock all reps</p>
              <p className="truncate text-sm text-white/60">
                You&apos;ve used your {FREE_EXERCISE_LIMIT} free reps — keep training for {PRO_PRICE}.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-spotlight px-4 py-2 text-sm font-semibold text-ink">{PRO_PRICE}</span>
          </div>
        </Link>
      )}

      {/* Free-preview progress (gentle conversion nudge). Held back until the
          first rep is done — value before any ask (engagement-first). */}
      {!pro && distinctAttempted >= 1 && distinctAttempted < FREE_EXERCISE_LIMIT && (
        <Link
          href="/train/unlock"
          className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface-1 p-3.5"
        >
          <p className="flex items-center gap-2 text-sm text-white/70">
            <LockOpenIcon className="h-4 w-4 shrink-0 text-white/40" />
            Free preview ·{' '}
            <span className="font-semibold text-white/90 tabular-nums">
              {distinctAttempted}/{FREE_EXERCISE_LIMIT}
            </span>{' '}
            used
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
            const isGoal = module.id === goalModuleId;
            if (!unlocked) {
              // Locked module — visible curiosity gap pointing at the Pro unlock.
              // The user's own goal module is called out by name: the clearest,
              // most honest reason this particular person would want Pro.
              return (
                <Link
                  key={module.id}
                  href="/train/unlock"
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border p-4 transition-colors active:scale-[0.99]',
                    isGoal
                      ? 'border-spotlight/30 bg-spotlight/[0.06] hover:bg-spotlight/[0.09]'
                      : 'border-hairline bg-surface-1 hover:bg-surface-2'
                  )}
                >
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl opacity-50', module.gradient)}>
                    {module.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold leading-tight text-white/80">{module.name}</p>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-spotlight/15 px-2 py-0.5 text-[10px] font-bold text-spotlight">
                        <LockClosedIcon className="h-3 w-3" />
                        PRO
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/45">{module.blurb}</p>
                    <p className="mt-1 text-[10px] font-semibold text-spotlight/80">
                      {isGoal
                        ? 'Your goal module'
                        : distinctAttempted === 0
                        ? 'Included in Pro'
                        : `Unlock · ${PRO_PRICE}`}
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/30" />
                </Link>
              );
            }
            const mp = progress
              ? moduleProgress(progress, module.id as ModuleId)
              : { pct: 0, completedPct: 0, started: false, masteredCount: 0, completedCount: 0, total: 0 };
            const statusLabel = moduleStatusLabel(mp);
            return (
              <Link
                key={module.id}
                href={`/train/module/${module.id}`}
                className="flex items-center gap-4 rounded-2xl border border-hairline bg-surface-2 p-4 transition-colors hover:bg-surface-3 active:scale-[0.99]"
              >
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl', module.gradient)}>
                  {module.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold leading-tight">{module.name}</p>
                    {isGoal && (
                      <span className="shrink-0 rounded-full bg-spotlight/15 px-2 py-0.5 text-[10px] font-bold text-spotlight">
                        YOUR GOAL
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/50">{module.blurb}</p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${mp.completedPct}%`, backgroundColor: module.accent }}
                    />
                  </div>
                  <p className="mt-1 text-[10px]" style={{ color: mp.pct === 100 ? '#FFC857' : mp.started ? module.accent : 'rgba(255,255,255,0.35)' }}>
                    {statusLabel}
                  </p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/30" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Free Play — Open Mic */}
      {(() => {
        const freePlayAttempts = progress?.exercises[FREE_PLAY_ID]?.attempts ?? 0;
        const freePlayAccessible = canAccessFreePlay({
          pro,
          freePlayAttempts,
          lastFreePlayDate: progress?.exercises[FREE_PLAY_ID]?.lastDate ?? null,
        });
        const href = freePlayAccessible ? `/train/exercise/${FREE_PLAY_ID}` : '/train/unlock';
        return (
          <Link
            href={href}
            className="mb-8 flex items-center gap-4 rounded-2xl border border-hairline bg-surface-1 p-4 transition-colors hover:bg-surface-2 active:scale-[0.99]"
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
                {freePlayAccessible && !pro && freePlayAttempts > 0 && (
                  <span className="rounded-full bg-spotlight/20 px-2 py-0.5 text-[10px] font-bold text-spotlight">
                    Free this week
                  </span>
                )}
                {!freePlayAccessible && (
                  <span className="flex items-center gap-1 rounded-full bg-spotlight/20 px-2.5 py-1 text-[10px] font-bold text-spotlight">
                    <LockClosedIcon className="h-3 w-3" />
                    PRO
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-white/50">Free Play — rehearse your own material, no rules.</p>
            </div>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/30" />
          </Link>
        );
      })()}
    </div>
  );
}
