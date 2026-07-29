'use client';

/**
 * Adaptive next-rep selection.
 *
 * Implements a lightweight spaced-repetition + mastery model to pick the
 * exercise the presenter should do next. The algorithm is entirely on-device
 * and deterministic — same progress state always returns the same result.
 *
 * Priority order:
 *   1. Any attempted exercise with lastScore < 60 that was last done >=1 day ago
 *      (weakest-area reinforcement).
 *   2. First not-yet-attempted exercise in path order (onboarding / new content).
 *   3. Oldest-last-practiced among attempted exercises with bestScore < 85
 *      (spaced repetition for exercises not yet mastered).
 *   4. Fallback to EXERCISES[0].
 */

import { EXERCISES, exercisesByModule, moduleForExercise, type Exercise, type ModuleId } from './exercises';
import { isModuleUnlocked } from './entitlement';
import { dayKey, type Progress } from './local-store';

// ─────────────────── Helpers ───────────────────

/** Returns true if the presenter has mastered this exercise (bestScore >= 70). */
export function isMastered(progress: Progress, exerciseId: string): boolean {
  const ex = progress.exercises[exerciseId];
  return !!ex && ex.bestScore >= 70;
}

// ─────────────────── Module helpers ───────────────────

/**
 * Returns the exercise the user should do next within a given module:
 *   1. First not-yet-attempted in module order.
 *   2. First with bestScore < 70 in module order (needs improvement).
 *   3. First in module order (replay for fully mastered modules).
 */
export function nextInModule(progress: Progress, moduleId: ModuleId): Exercise {
  const exercises = exercisesByModule(moduleId);
  const notAttempted = exercises.find((e) => !(progress.exercises[e.id]?.attempts > 0));
  if (notAttempted) return notAttempted;
  const needsWork = exercises.find((e) => (progress.exercises[e.id]?.bestScore ?? 0) < 70);
  if (needsWork) return needsWork;
  return exercises[0];
}

/**
 * Returns progress stats for a module.
 *
 * Completion and mastery are tracked separately: a rep you have done counts as
 * completed straight away, but only counts as mastered at bestScore >= 70. The
 * UI draws its progress bar from `completedPct` so it moves after every rep,
 * and reserves the "Mastered" label for `pct === 100`.
 *
 * masteredCount = exercises with bestScore >= 70 · pct = masteredCount / total.
 * completedCount = exercises attempted at least once · completedPct likewise.
 * started = any exercise in the module has been attempted.
 */
export function moduleProgress(
  progress: Progress,
  moduleId: ModuleId
): {
  masteredCount: number;
  completedCount: number;
  total: number;
  pct: number;
  completedPct: number;
  started: boolean;
} {
  const exercises = exercisesByModule(moduleId);
  const total = exercises.length;
  const masteredCount = exercises.filter((e) => isMastered(progress, e.id)).length;
  const completedCount = exercises.filter((e) => (progress.exercises[e.id]?.attempts ?? 0) > 0).length;
  const pct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  return { masteredCount, completedCount, total, pct, completedPct, started: completedCount > 0 };
}

/**
 * Human-readable module status for the home list and module header.
 * Mastered (every rep >=70) → All reps done → In progress → Start module.
 */
export function moduleStatusLabel(mp: { pct: number; completedPct: number; started: boolean }): string {
  if (mp.pct === 100) return 'Mastered';
  if (mp.completedPct === 100) return 'All reps done';
  return mp.started ? 'In progress' : 'Start module';
}

// ─────────────────── Core selector ───────────────────

function daysBetweenDates(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime();
  return Math.round(ms / 86400000);
}

/**
 * Recommend the next exercise for the presenter to work on.
 *
 * Returns the exercise and a short human-readable reason to show in the UI.
 *
 * `pro` gates the candidate pool: for free users we never recommend an exercise
 * that lives in a locked module, so the suggestion always lands somewhere they
 * can actually start.
 */
export function recommendNext(
  progress: Progress,
  pro: boolean
): { exercise: Exercise; reason: string } {
  const today = dayKey();

  // Only ever recommend exercises the user can actually open. Unmapped
  // exercises (none today) are treated as accessible so nothing silently hides.
  const pool = EXERCISES.filter((ex) => {
    const mod = moduleForExercise(ex.id);
    return !mod || isModuleUnlocked({ pro, order: mod.order });
  });

  // ── Priority 1: Weakest attempted exercise, >=1 day old, score < 60 ──
  for (const ex of pool) {
    const ep = progress.exercises[ex.id];
    if (!ep) continue;
    if (ep.lastScore >= 60) continue;
    const lastDate = ep.lastDate ? dayKey(new Date(ep.lastDate)) : null;
    if (lastDate && daysBetweenDates(lastDate, today) >= 1) {
      return {
        exercise: ex,
        reason: "Your weakest area — let's lock it in.",
      };
    }
  }

  // ── Priority 2: First not-yet-attempted exercise in path order ──
  const notAttempted = pool.find((ex) => !progress.exercises[ex.id]);
  if (notAttempted) {
    return {
      exercise: notAttempted,
      reason: 'Next in your path.',
    };
  }

  // ── Priority 3: Oldest-last-practiced among exercises with bestScore < 85 ──
  const candidates = pool.filter((ex) => {
    const ep = progress.exercises[ex.id];
    return ep && ep.bestScore < 85;
  });
  if (candidates.length > 0) {
    // Sort by lastDate ascending (oldest first).
    const oldest = candidates.reduce((prev, cur) => {
      const prevDate = progress.exercises[prev.id]?.lastDate ?? '';
      const curDate = progress.exercises[cur.id]?.lastDate ?? '';
      return curDate < prevDate ? cur : prev;
    });
    return {
      exercise: oldest,
      reason: 'Time to sharpen this one.',
    };
  }

  // ── Fallback ──
  return {
    exercise: pool[0] ?? EXERCISES[0],
    reason: 'Keep the habit going.',
  };
}
