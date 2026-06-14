'use client';

/**
 * Deterministic, on-device achievement system.
 *
 * Achievements are evaluated after every rep using only local state — no
 * network, no backend. The unlocked set is persisted to a separate localStorage
 * key so it survives progress resets without being tangled with the main store.
 *
 * Circular-import safety: this module imports types from exercises/coach only
 * via `import type` and reads Progress shape from local-store types only, never
 * calling local-store functions (callers wire the two together).
 */

import type { Dimension } from './exercises';
import type { CoachResult } from './coach';
import type { Progress } from './local-store';

// ──────────────────────── Types ────────────────────────

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

// ──────────────────────── Registry ────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-rep',
    name: 'First Rep',
    emoji: '🎤',
    description: 'Complete your first recorded take.',
  },
  {
    id: 'filler-free',
    name: 'Filler-Free',
    emoji: '🚫',
    description: 'Complete a take with zero filler words detected.',
  },
  {
    id: 'pace-zone',
    name: 'Pace Zone',
    emoji: '🏃',
    description: 'Hit the 130–160 wpm pace benchmark in a single take.',
  },
  {
    id: 'perfect-take',
    name: 'Perfect Take',
    emoji: '💯',
    description: 'Score 90 or above overall on a single take.',
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    emoji: '🔥',
    description: 'Build a 7-day practice streak.',
  },
  {
    id: 'comeback',
    name: 'Comeback',
    emoji: '🛡️',
    description: 'Use a streak grace day and keep your streak alive.',
  },
  {
    id: 'specialist',
    name: 'Specialist',
    emoji: '⭐',
    description: 'Score 90 or above on an exercise you have attempted before.',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    emoji: '🗺️',
    description: 'Complete at least one rep in all three skill tracks.',
  },
  {
    id: 'structured',
    name: 'Structured',
    emoji: '🧩',
    description: 'Score 85 or above on Opening (hook) in a single take.',
  },
  {
    id: 'marathon',
    name: 'Marathon',
    emoji: '🏅',
    description: 'Complete a total of 25 reps across all exercises.',
  },
];

// Build a lookup map for fast access.
const ACHIEVEMENT_MAP = new Map<string, Achievement>(ACHIEVEMENTS.map((a) => [a.id, a]));

// ─────────────────── Persistence ───────────────────

const UNLOCKED_KEY = 'smartspeak.achievements.v1';

export function loadUnlockedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(UNLOCKED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed as string[]);
  } catch {
    return new Set();
  }
}

export function saveUnlockedIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage full / unavailable */
  }
}

/** Returns the Achievement objects for all unlocked ids, in unlock order. */
export function loadUnlockedAchievements(): Achievement[] {
  const ids = loadUnlockedIds();
  return [...ids].flatMap((id) => {
    const a = ACHIEVEMENT_MAP.get(id);
    return a ? [a] : [];
  });
}

// ─────────────────── Evaluation context ───────────────────

export interface AchievementContext {
  /** The full CoachResult for the just-completed take. */
  result: CoachResult;
  /** Updated Progress (after the attempt has been recorded). */
  progress: Progress;
  /** The exercise id that was just completed. */
  exerciseId: string;
  /** Whether the streak grace was used this session. */
  graceUsedThisSession: boolean;
  /** Total number of reps ever completed (= progress.history.length). */
  totalReps: number;
}

// ─────────────────── Individual checks ───────────────────

function checkFirstRep(ctx: AchievementContext): boolean {
  return ctx.totalReps >= 1;
}

function checkFillerFree(ctx: AchievementContext): boolean {
  return ctx.result.fillerCount === 0;
}

function checkPaceZone(ctx: AchievementContext): boolean {
  const pace = ctx.result.scores.find((s) => s.dimension === ('pace' as Dimension));
  if (!pace || !pace.measured) return false;
  // A score of >=80 on pace correlates with landing in the 130–160 wpm zone
  // (the bell peaks at 145 wpm with span 75 — score >=80 maps to ~120–170 wpm).
  return pace.score >= 80;
}

function checkPerfectTake(ctx: AchievementContext): boolean {
  return ctx.result.overallScore >= 90;
}

function checkWeekWarrior(ctx: AchievementContext): boolean {
  return ctx.progress.streak >= 7;
}

function checkComeback(ctx: AchievementContext): boolean {
  return ctx.graceUsedThisSession;
}

function checkSpecialist(ctx: AchievementContext): boolean {
  const ex = ctx.progress.exercises[ctx.exerciseId];
  // Must have had >1 attempt (attempts was incremented before evaluation)
  // and the best score (which reflects this take) is >=90.
  if (!ex || ex.attempts < 2) return false;
  return ex.bestScore >= 90;
}

function checkExplorer(ctx: AchievementContext): boolean {
  // Import exercise list to check tracks — inline require avoids a top-level
  // circular import while keeping this file dependency-light.
  const { EXERCISES } = require('./exercises') as typeof import('./exercises');
  const tracks = new Set<string>();
  for (const id of Object.keys(ctx.progress.exercises)) {
    const ex = EXERCISES.find((e) => e.id === id);
    if (ex) tracks.add(ex.track);
  }
  return tracks.size >= 3;
}

function checkStructured(ctx: AchievementContext): boolean {
  const hook = ctx.result.scores.find((s) => s.dimension === ('hook' as Dimension));
  if (!hook || !hook.measured) return false;
  return hook.score >= 85;
}

function checkMarathon(ctx: AchievementContext): boolean {
  return ctx.totalReps >= 25;
}

// ─────────────────── Main evaluator ───────────────────

/** Map achievement id → check function. */
const CHECKS: Record<string, (ctx: AchievementContext) => boolean> = {
  'first-rep': checkFirstRep,
  'filler-free': checkFillerFree,
  'pace-zone': checkPaceZone,
  'perfect-take': checkPerfectTake,
  'week-warrior': checkWeekWarrior,
  comeback: checkComeback,
  specialist: checkSpecialist,
  explorer: checkExplorer,
  structured: checkStructured,
  marathon: checkMarathon,
};

/**
 * Evaluate which achievements are newly unlocked after a completed rep.
 *
 * Returns an array of newly-unlocked achievement ids (empty if none).
 * Side-effect: persists the updated unlocked set to localStorage.
 */
export function evaluateAchievements(ctx: AchievementContext): string[] {
  const unlocked = loadUnlockedIds();
  const newlyUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.has(achievement.id)) continue; // already unlocked — skip
    const check = CHECKS[achievement.id];
    if (check && check(ctx)) {
      unlocked.add(achievement.id);
      newlyUnlocked.push(achievement.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlockedIds(unlocked);
  }

  return newlyUnlocked;
}
