import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { installStorage, removeStorage } from './helpers';

installStorage();

import {
  recommendNext,
  moduleProgress,
  moduleStatusLabel,
  nextInModule,
  isMastered,
  isExerciseUnlockedInModule,
  isModuleUnlockedByProgress,
} from '@/lib/selection';
import { MODULES, exercisesByModule, moduleForExercise, FREE_PLAY_ID, type ModuleId } from '@/lib/exercises';
import { isModuleUnlocked } from '@/lib/entitlement';
import type { ExerciseProgress, Progress } from '@/lib/local-store';

const freeModule = MODULES.find((m) => isModuleUnlocked({ pro: false, order: m.order }))!;
const paidModule = MODULES.find((m) => !isModuleUnlocked({ pro: false, order: m.order }))!;
const freeExercises = exercisesByModule(freeModule.id as ModuleId);

function ex(overrides: Partial<ExerciseProgress> = {}): ExerciseProgress {
  return { attempts: 1, bestScore: 80, lastScore: 80, lastDate: '2026-03-08', ...overrides };
}

function progressWith(exercises: Record<string, ExerciseProgress>): Progress {
  return {
    xp: 0,
    streak: 0,
    lastPracticeDay: null,
    todayXp: 0,
    todayDay: null,
    exercises,
    history: [],
  };
}

beforeEach(() => {
  installStorage();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
  removeStorage();
});

describe('recommendNext', () => {
  it('never recommends a locked exercise to a free user', () => {
    // Everything free is done and mastered — the pool must still not reach
    // into a paid module, or the recommendation lands on a paywall.
    const done = Object.fromEntries(freeExercises.map((e) => [e.id, ex({ bestScore: 100 })]));
    const { exercise } = recommendNext(progressWith(done), false);
    const module = moduleForExercise(exercise.id);
    expect(module && isModuleUnlocked({ pro: false, order: module.order })).toBe(true);
  });

  it('reaches into paid modules for a Pro user', () => {
    const done = Object.fromEntries(freeExercises.map((e) => [e.id, ex({ bestScore: 100 })]));
    const { exercise } = recommendNext(progressWith(done), true);
    expect(freeExercises.map((e) => e.id)).not.toContain(exercise.id);
  });

  it('prioritises a weak attempt from a previous day over new content', () => {
    const weak = freeExercises[1];
    const { exercise, reason } = recommendNext(
      progressWith({ [weak.id]: ex({ lastScore: 40, lastDate: '2026-03-01' }) }),
      false
    );
    expect(exercise.id).toBe(weak.id);
    expect(reason).toMatch(/weakest/i);
  });

  it('does not re-serve a weak attempt from the same day', () => {
    const weak = freeExercises[1];
    const { exercise } = recommendNext(
      progressWith({ [weak.id]: ex({ lastScore: 40, lastDate: '2026-03-08T09:00:00' }) }),
      false
    );
    expect(exercise.id).not.toBe(weak.id);
  });

  it('otherwise serves the first unattempted exercise in path order', () => {
    const { exercise, reason } = recommendNext(
      progressWith({ [freeExercises[0].id]: ex() }),
      false
    );
    expect(exercise.id).toBe(freeExercises[1].id);
    expect(reason).toMatch(/next/i);
  });

  it('is deterministic — same state, same answer', () => {
    const state = progressWith({ [freeExercises[0].id]: ex() });
    expect(recommendNext(state, false).exercise.id).toBe(recommendNext(state, false).exercise.id);
  });

  it('always returns an exercise, even with empty progress', () => {
    expect(recommendNext(progressWith({}), false).exercise).toBeTruthy();
    expect(recommendNext(progressWith({}), true).exercise).toBeTruthy();
  });
});

describe('moduleProgress', () => {
  const id = freeModule.id as ModuleId;

  it('separates completion from mastery', () => {
    // Attempted but scored below the mastery bar: the bar moves, the label doesn't.
    const attempted = Object.fromEntries(freeExercises.map((e) => [e.id, ex({ bestScore: 40 })]));
    const mp = moduleProgress(progressWith(attempted), id);
    expect(mp.completedPct).toBe(100);
    expect(mp.pct).toBe(0);
    expect(moduleStatusLabel(mp)).toBe('All reps done');
  });

  it('reports Mastered only when every rep clears the bar', () => {
    const mastered = Object.fromEntries(freeExercises.map((e) => [e.id, ex({ bestScore: 90 })]));
    const mp = moduleProgress(progressWith(mastered), id);
    expect(mp.pct).toBe(100);
    expect(moduleStatusLabel(mp)).toBe('Mastered');
  });

  it('reports an untouched module as not started', () => {
    const mp = moduleProgress(progressWith({}), id);
    expect(mp.started).toBe(false);
    expect(moduleStatusLabel(mp)).toBe('Start module');
  });

  it('never reports mastery above completion', () => {
    for (const module of MODULES) {
      const partial = { [exercisesByModule(module.id as ModuleId)[0].id]: ex({ bestScore: 95 }) };
      const mp = moduleProgress(progressWith(partial), module.id as ModuleId);
      expect(mp.masteredCount).toBeLessThanOrEqual(mp.completedCount);
    }
  });
});

describe('nextInModule', () => {
  const id = freeModule.id as ModuleId;

  it('serves the first unattempted rep', () => {
    expect(nextInModule(progressWith({ [freeExercises[0].id]: ex() }), id).id).toBe(
      freeExercises[1].id
    );
  });

  it('falls back to the weakest rep once all are attempted', () => {
    const all = Object.fromEntries(freeExercises.map((e) => [e.id, ex({ bestScore: 90 })]));
    all[freeExercises[2].id] = ex({ bestScore: 50 });
    expect(nextInModule(progressWith(all), id).id).toBe(freeExercises[2].id);
  });

  it('replays the first rep for a fully mastered module', () => {
    const all = Object.fromEntries(freeExercises.map((e) => [e.id, ex({ bestScore: 95 })]));
    expect(nextInModule(progressWith(all), id).id).toBe(freeExercises[0].id);
  });
});

describe('isExerciseUnlockedInModule', () => {
  const id = freeModule.id as ModuleId;

  it('locks the second exercise until the first has an attempt', () => {
    expect(isExerciseUnlockedInModule(progressWith({}), id, freeExercises[1].id)).toBe(false);
    const started = progressWith({ [freeExercises[0].id]: ex() });
    expect(isExerciseUnlockedInModule(started, id, freeExercises[1].id)).toBe(true);
  });

  it('keeps an attempted exercise unlocked even if a later one is attempted out of order', () => {
    // Only the third exercise has an attempt — a state that should never
    // arise through normal play, but a stale deep link could still hit it.
    const outOfOrder = progressWith({ [freeExercises[2].id]: ex() });
    expect(isExerciseUnlockedInModule(outOfOrder, id, freeExercises[2].id)).toBe(true);
    expect(isExerciseUnlockedInModule(outOfOrder, id, freeExercises[1].id)).toBe(false);
  });

  it('always unlocks free play', () => {
    expect(isExerciseUnlockedInModule(progressWith({}), id, FREE_PLAY_ID)).toBe(true);
  });

  it('unlocks the first exercise with no progress at all', () => {
    expect(isExerciseUnlockedInModule(progressWith({}), id, freeExercises[0].id)).toBe(true);
  });
});

describe('isMastered', () => {
  it('uses the best score ever, not the most recent one', () => {
    const state = progressWith({ [freeExercises[0].id]: ex({ bestScore: 95, lastScore: 10 }) });
    expect(isMastered(state, freeExercises[0].id)).toBe(true);
  });

  it('is false for an exercise never attempted', () => {
    expect(isMastered(progressWith({}), paidModule.id)).toBe(false);
  });
});

describe('isModuleUnlockedByProgress', () => {
  const module1 = MODULES.find((m) => m.order === 1)!;
  const module2 = MODULES.find((m) => m.order === 2)!;
  const module3 = MODULES.find((m) => m.order === 3)!;
  const module4 = MODULES.find((m) => m.order === 4)!;
  const module5 = MODULES.find((m) => m.order === 5)!;

  /** Every exercise in a module attempted at least once — "completed". */
  function completed(moduleId: ModuleId): Record<string, ExerciseProgress> {
    return Object.fromEntries(exercisesByModule(moduleId).map((e) => [e.id, ex()]));
  }

  it('opens the first three modules from a blank slate', () => {
    const state = progressWith({});
    expect(isModuleUnlockedByProgress(state, module1.id as ModuleId)).toBe(true);
    expect(isModuleUnlockedByProgress(state, module2.id as ModuleId)).toBe(true);
    expect(isModuleUnlockedByProgress(state, module3.id as ModuleId)).toBe(true);
  });

  it('locks the fourth module with no progress', () => {
    expect(isModuleUnlockedByProgress(progressWith({}), module4.id as ModuleId)).toBe(false);
  });

  it('unlocks the fourth module, and no further, once module 1 is completed', () => {
    const state = progressWith(completed(module1.id as ModuleId));
    expect(isModuleUnlockedByProgress(state, module4.id as ModuleId)).toBe(true);
    expect(isModuleUnlockedByProgress(state, module5.id as ModuleId)).toBe(false);
  });

  it('unlocks the fifth module once two modules are completed', () => {
    const state = progressWith({
      ...completed(module1.id as ModuleId),
      ...completed(module2.id as ModuleId),
    });
    expect(isModuleUnlockedByProgress(state, module5.id as ModuleId)).toBe(true);
  });

  it('is independent of pro', () => {
    // The gate takes no pro flag at all — buying Pro never substitutes for
    // finishing earlier modules.
    const state = progressWith({});
    expect(isModuleUnlockedByProgress(state, module4.id as ModuleId)).toBe(false);
    expect(isModuleUnlocked({ pro: true, order: module4.order })).toBe(true);
  });
});
