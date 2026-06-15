'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from '@/lib/entitlement';
import { nextInModule, moduleProgress, isMastered } from '@/lib/selection';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
    : { pct: 0, started: false, masteredCount: 0, total: exercises.length };

  const statusLabel =
    mp.pct === 100 ? 'Mastered' : mp.started ? 'In progress' : 'Start module';

  // Completed = exercises with at least one attempt, in module order.
  const completedExercises = progress
    ? exercises.filter((e) => (progress.exercises[e.id]?.attempts ?? 0) > 0)
    : [];

  // Next exercise via nextInModule helper.
  const next = progress ? nextInModule(progress, moduleId) : exercises[0];

  // Determine if next exercise is accessible.
  const nextAlreadyAttempted = progress
    ? (progress.exercises[next.id]?.attempts ?? 0) > 0
    : false;
  // Exclude FREE_PLAY_ID so free-play never burns a preview slot.
  const distinctAttempted = progress
    ? Object.entries(progress.exercises).filter(
        ([id, e]) => e.attempts > 0 && id !== FREE_PLAY_ID
      ).length
    : 0;
  const nextAccessible = canAccessExercise({
    pro,
    alreadyAttempted: nextAlreadyAttempted,
    distinctAttempted,
  });

  const ctaHref = nextAccessible
    ? `/train/exercise/${next.id}`
    : '/train/unlock';

  return (
    <div className="flex min-h-[100dvh] flex-col px-5 pb-8 pt-5">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/train" className="text-sm text-white/50 hover:text-white">
          ‹ Back
        </Link>
      </div>

      {/* Module header */}
      <div className="mb-6">
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

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${mp.pct}%`, backgroundColor: learningModule.accent }}
            />
          </div>
          <p
            className="mt-1.5 text-xs font-medium"
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
        </div>
      </div>

      {/* Completed reps */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
          Completed
        </h2>
        {completedExercises.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-white/45">
              Your finished reps will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedExercises.map((exercise) => {
              const ep = progress?.exercises[exercise.id];
              const mastered = progress ? isMastered(progress, exercise.id) : false;
              const best = ep?.bestScore;
              return (
                <Link
                  key={exercise.id}
                  href={`/train/exercise/${exercise.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 transition-colors hover:bg-white/[0.08]"
                >
                  <span className="text-xl">{exercise.emoji}</span>
                  <p className="flex-1 truncate text-sm font-semibold">
                    {exercise.title}
                  </p>
                  {typeof best === 'number' && (
                    <p
                      className="shrink-0 text-sm font-bold"
                      style={{ color: mastered ? '#FFC857' : learningModule.accent }}
                    >
                      {mastered ? '✦ ' : ''}{best}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Next up — mysterious card */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
          Next up
        </h2>
        <Link
          href={ctaHref}
          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition-colors hover:bg-white/[0.08] active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl text-white/30">
            ?
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Next up</p>
            <p className="text-xs text-white/45">Keep going to reveal it.</p>
          </div>
          <span className="shrink-0 text-white/30">›</span>
        </Link>
      </div>

      {/* Primary CTA */}
      <Button
        onClick={() => router.push(ctaHref)}
        size="lg"
        className="h-14 w-full rounded-2xl bg-spotlight text-base text-ink hover:bg-spotlight-soft"
      >
        {mp.started ? 'Continue module' : 'Start module'}
      </Button>
    </div>
  );
}
