'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeftIcon,
  CheckIcon,
  LockClosedIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import {
  getModule,
  exercisesByModule,
  FREE_PLAY_ID,
  type ModuleId,
} from '@/lib/exercises';
import { loadProgress, type Progress } from '@/lib/local-store';
import {
  isProCached,
  refreshEntitlement,
  canAccessExercise,
  isModuleUnlocked,
  PRO_PRICE,
} from '@/lib/entitlement';
import { nextInModule, moduleProgress, moduleStatusLabel, isMastered } from '@/lib/selection';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/** Where a step sits in the path — drives its node styling and subtitle. */
type StepState = 'mastered' | 'done' | 'current' | 'upcoming' | 'locked';

export default function ModulePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const moduleId = params.id as ModuleId;
  const learningModule = getModule(moduleId);

  const [progress, setProgress] = useState<Progress | null>(null);
  const [pro, setPro] = useState(false);

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setPro(isProCached());
    refreshEntitlement().then(setPro);
  }, []);

  if (!learningModule) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-white/70">Module not found.</p>
        <Button asChild variant="secondary">
          <Link href="/train">Back to home</Link>
        </Button>
      </div>
    );
  }

  const exercises = exercisesByModule(moduleId);
  const mp = progress
    ? moduleProgress(progress, moduleId)
    : {
        pct: 0,
        completedPct: 0,
        started: false,
        masteredCount: 0,
        completedCount: 0,
        total: exercises.length,
      };

  const statusLabel = moduleStatusLabel(mp);

  // The step the user should do next — highlighted as "current" in the path.
  const next = progress ? nextInModule(progress, moduleId) : exercises[0];

  // Exclude FREE_PLAY_ID so free-play never burns a preview slot.
  const distinctAttempted = progress
    ? Object.entries(progress.exercises).filter(
        ([id, e]) => e.attempts > 0 && id !== FREE_PLAY_ID
      ).length
    : 0;

  const moduleLocked = !isModuleUnlocked({ pro, order: learningModule.order });

  function stateFor(exerciseId: string): StepState {
    const attempts = progress?.exercises[exerciseId]?.attempts ?? 0;
    if (attempts > 0) {
      return progress && isMastered(progress, exerciseId) ? 'mastered' : 'done';
    }
    const accessible = canAccessExercise({
      pro,
      alreadyAttempted: false,
      distinctAttempted,
    });
    if (moduleLocked || !accessible) return 'locked';
    return exerciseId === next.id ? 'current' : 'upcoming';
  }

  const ctaState = stateFor(next.id);
  const ctaHref =
    ctaState === 'locked' ? '/train/unlock' : `/train/exercise/${next.id}`;

  return (
    <div className="flex min-h-[100dvh] flex-col px-5 pb-8 pt-5">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/train"
          className="flex w-fit items-center gap-1 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back
        </Link>
      </div>

      {/* Module header */}
      <div className="mb-7">
        <div
          className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br text-3xl',
            learningModule.gradient
          )}
        >
          {learningModule.emoji}
        </div>
        <h1 className="text-3xl font-bold leading-tight">{learningModule.name}</h1>
        <p className="mt-1 text-white/55">{learningModule.blurb}</p>

        {/* Progress bar — completion-based so it moves after every rep */}
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${mp.completedPct}%`,
                backgroundColor: learningModule.accent,
              }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p
              className="text-xs font-medium"
              style={{
                color:
                  mp.pct === 100
                    ? '#FFC857'
                    : mp.started
                    ? learningModule.accent
                    : 'rgba(255,255,255,0.35)',
              }}
            >
              {statusLabel}
            </p>
            <p className="flex items-center gap-1 text-xs text-white/40">
              <span className="tabular-nums">
                {mp.completedCount} of {mp.total} done
              </span>
              {mp.masteredCount > 0 && (
                <>
                  <span className="text-white/25">·</span>
                  <StarIcon className="h-3.5 w-3.5 text-spotlight" />
                  <span className="tabular-nums">{mp.masteredCount}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* The path — every rep in the module, in order, always visible */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/40">
          Your path
        </h2>
        <ol className="space-y-0">
          {exercises.map((exercise, i) => {
            const state = stateFor(exercise.id);
            const ep = progress?.exercises[exercise.id];
            const best = ep?.bestScore;
            const isLast = i === exercises.length - 1;
            // The connector below this node is "lit" once this step is done.
            const connectorLit = state === 'done' || state === 'mastered';

            return (
              <li key={exercise.id} className="flex gap-4">
                {/* Node + connector rail */}
                <div className="flex w-12 shrink-0 flex-col items-center">
                  <PathNode
                    state={state}
                    emoji={exercise.emoji}
                    accent={learningModule.accent}
                  />
                  {!isLast && (
                    <div
                      className="w-0.5 flex-1 rounded-full transition-colors"
                      style={{
                        minHeight: 24,
                        backgroundColor: connectorLit
                          ? learningModule.accent
                          : 'rgba(255,255,255,0.10)',
                      }}
                    />
                  )}
                </div>

                {/* Step card */}
                <StepCard
                  exercise={exercise}
                  state={state}
                  best={best}
                  accent={learningModule.accent}
                  isLast={isLast}
                />
              </li>
            );
          })}
        </ol>
      </div>

      {/* Primary CTA */}
      <Button
        onClick={() => router.push(ctaHref)}
        size="lg"
        className="mt-auto h-14 w-full rounded-2xl bg-spotlight text-base text-ink hover:bg-spotlight-soft"
      >
        {ctaState === 'locked'
          ? distinctAttempted === 0
            ? "See what's in Pro"
            : `Unlock · ${PRO_PRICE}`
          : mp.started
          ? `Continue · ${next.title}`
          : `Start · ${next.title}`}
      </Button>
    </div>
  );
}

/** Circular path node — mirrors the step's state at a glance. */
function PathNode({
  state,
  emoji,
  accent,
}: {
  state: StepState;
  emoji: string;
  accent: string;
}) {
  if (state === 'mastered') {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink"
        style={{ backgroundColor: '#FFC857' }}
      >
        <StarIcon className="h-6 w-6 stroke-[2.5]" />
      </div>
    );
  }
  if (state === 'done') {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink"
        style={{ backgroundColor: accent }}
      >
        <CheckIcon className="h-6 w-6 stroke-[3]" />
      </div>
    );
  }
  if (state === 'current') {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ring-4"
        style={{
          backgroundColor: 'rgba(255,255,255,0.10)',
          // Tailwind can't express a dynamic ring colour, so drive it inline.
          boxShadow: `0 0 0 3px ${accent}55`,
        }}
      >
        {emoji}
      </div>
    );
  }
  if (state === 'locked') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/30">
        <LockClosedIcon className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xl opacity-45">
      {emoji}
    </div>
  );
}

/** The tappable card beside each node. */
function StepCard({
  exercise,
  state,
  best,
  accent,
  isLast,
}: {
  exercise: { id: string; title: string; summary: string };
  state: StepState;
  best: number | undefined;
  accent: string;
  isLast: boolean;
}) {
  const href = state === 'locked' ? '/train/unlock' : `/train/exercise/${exercise.id}`;

  const subtitle =
    state === 'mastered'
      ? 'Mastered — replay to beat your best'
      : state === 'done'
      ? 'Done — try again to raise your score'
      : state === 'current'
      ? exercise.summary
      : state === 'locked'
      ? `Unlock with Pro · ${PRO_PRICE}`
      : exercise.summary;

  return (
    <Link
      href={href}
      className={cn(
        'mb-3 min-w-0 flex-1 rounded-2xl border px-4 py-3 transition-colors active:scale-[0.99]',
        isLast && 'mb-0',
        state === 'current'
          ? 'border-spotlight/40 bg-spotlight/10 hover:bg-spotlight/15'
          : state === 'upcoming' || state === 'locked'
          ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
          : 'border-white/10 bg-white/[0.05] hover:bg-white/[0.08]'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm font-semibold',
              state === 'upcoming' || state === 'locked' ? 'text-white/55' : 'text-white'
            )}
          >
            {exercise.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-white/45">{subtitle}</p>
        </div>
        {typeof best === 'number' && (state === 'done' || state === 'mastered') && (
          <p
            className="shrink-0 text-sm font-bold"
            style={{ color: state === 'mastered' ? '#FFC857' : accent }}
          >
            {best}
          </p>
        )}
        {state === 'current' && (
          <span className="shrink-0 rounded-full bg-spotlight px-3 py-1 text-xs font-bold text-ink">
            Go
          </span>
        )}
      </div>
    </Link>
  );
}
