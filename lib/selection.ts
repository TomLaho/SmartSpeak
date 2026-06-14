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

import { EXERCISES, type Exercise } from './exercises';
import type { Progress } from './local-store';

// ─────────────────── Helpers ───────────────────

/** Returns true if the presenter has mastered this exercise (bestScore >= 70). */
export function isMastered(progress: Progress, exerciseId: string): boolean {
  const ex = progress.exercises[exerciseId];
  return !!ex && ex.bestScore >= 70;
}

/**
 * Returns a message when the presenter needs more clean reps before the next
 * level unlocks, or null if there is no gate.
 *
 * "Clean rep" = score >= 70. The gate requires at least 2 clean reps per
 * exercise before treating a track level as complete.
 */
export function masteryGateMessage(progress: Progress, trackId: string): string | null {
  const trackExercises = EXERCISES.filter((e) => e.track === trackId);
  let needed = 0;
  for (const ex of trackExercises) {
    const ep = progress.exercises[ex.id];
    if (!ep) {
      needed += 2; // not started: needs 2 clean reps
      continue;
    }
    const cleanReps = ep.attempts > 0 && ep.bestScore >= 70 ? Math.min(ep.attempts, 2) : 0;
    if (cleanReps < 2) needed += 2 - cleanReps;
  }
  if (needed === 0) return null;
  return `${needed} more clean rep${needed === 1 ? '' : 's'} to unlock the next level.`;
}

// ─────────────────── Core selector ───────────────────

function daysBetweenDates(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime();
  return Math.round(ms / 86400000);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Recommend the next exercise for the presenter to work on.
 *
 * Returns the exercise and a short human-readable reason to show in the UI.
 */
export function recommendNext(progress: Progress): { exercise: Exercise; reason: string } {
  const today = todayKey();

  // ── Priority 1: Weakest attempted exercise, >=1 day old, score < 60 ──
  for (const ex of EXERCISES) {
    const ep = progress.exercises[ex.id];
    if (!ep) continue;
    if (ep.lastScore >= 60) continue;
    const lastDate = ep.lastDate ? ep.lastDate.slice(0, 10) : null;
    if (lastDate && daysBetweenDates(lastDate, today) >= 1) {
      return {
        exercise: ex,
        reason: "Your weakest area — let's lock it in.",
      };
    }
  }

  // ── Priority 2: First not-yet-attempted exercise in path order ──
  const notAttempted = EXERCISES.find((ex) => !progress.exercises[ex.id]);
  if (notAttempted) {
    return {
      exercise: notAttempted,
      reason: 'Next in your path.',
    };
  }

  // ── Priority 3: Oldest-last-practiced among exercises with bestScore < 85 ──
  const candidates = EXERCISES.filter((ex) => {
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
    exercise: EXERCISES[0],
    reason: 'Keep the habit going.',
  };
}
