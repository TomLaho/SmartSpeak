'use client';

/**
 * Zero-backend progress store.
 *
 * Persists the learner's streak, XP, daily goal progress, per-exercise best
 * scores and recent attempts to localStorage so the trainer is fully usable
 * with no account and no server. (The cloud build can later sync this shape to
 * the database keyed by user.)
 */

import { DAILY_GOAL_XP } from './exercises';

const KEY = 'smartspeak.progress.v1';
const DAILY_GOAL_REPS_KEY = 'smartspeak.dailyGoalReps.v1';
const LAST_CHALLENGE_KEY = 'smartspeak.lastChallenge.v1';

export interface AttemptRecord {
  id: string;
  exerciseId: string;
  date: string; // ISO
  score: number;
  xp: number;
  wordCount: number;
  /** Per-dimension scores for this attempt (for sparklines and coach baselines). */
  dims?: Partial<Record<string, number>>;
}

export interface ExerciseProgress {
  attempts: number;
  bestScore: number;
  lastScore: number;
  lastDate: string;
}

export interface Progress {
  xp: number;
  streak: number;
  lastPracticeDay: string | null; // YYYY-MM-DD
  todayXp: number;
  todayDay: string | null; // YYYY-MM-DD the todayXp belongs to
  exercises: Record<string, ExerciseProgress>;
  history: AttemptRecord[];
  /**
   * The YYYY-MM-DD on which the last streak grace was consumed.
   * A grace is granted when the gap since lastPracticeDay is exactly 2 days
   * and no grace was used in the preceding 7 days.
   */
  graceUsedDay?: string | null;
}

const EMPTY: Progress = {
  xp: 0,
  streak: 0,
  lastPracticeDay: null,
  todayXp: 0,
  todayDay: null,
  exercises: {},
  history: [],
};

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime();
  return Math.round(ms / 86400000);
}

export function loadProgress(): Progress {
  if (typeof window === 'undefined') return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = { ...EMPTY, ...(JSON.parse(raw) as Progress) };
    // Reset the daily counter if it belongs to a previous day.
    if (parsed.todayDay !== dayKey()) {
      parsed.todayXp = 0;
      parsed.todayDay = dayKey();
    }
    // Streak break / grace logic — evaluated once on load so reads are always consistent.
    if (parsed.lastPracticeDay) {
      const gap = daysBetween(parsed.lastPracticeDay, dayKey());
      if (gap > 1) {
        // Gap of exactly 2 days: apply a grace day if available (one per 7 days).
        if (gap === 2 && canUseGrace(parsed)) {
          parsed.graceUsedDay = dayKey();
        } else {
          parsed.streak = 0;
        }
      }
    }
    return parsed;
  } catch {
    return { ...EMPTY };
  }
}

/** True when no grace has been used within the last 7 days. */
function canUseGrace(progress: Progress): boolean {
  if (!progress.graceUsedDay) return true;
  return daysBetween(progress.graceUsedDay, dayKey()) >= 7;
}

function save(progress: Progress): Progress {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      /* storage full / unavailable — degrade silently */
    }
  }
  return progress;
}

export interface RecordInput {
  exerciseId: string;
  score: number;
  xp: number;
  wordCount: number;
  /** Per-dimension scores to persist for sparklines and coach baselines. */
  dims?: Partial<Record<string, number>>;
}

/** Records a completed take and returns the updated progress + streak deltas. */
export function recordAttempt(input: RecordInput): {
  progress: Progress;
  streakIncreased: boolean;
  goalReached: boolean;
  /** Achievement ids unlocked by this attempt (evaluated externally via achievements module). */
  newAchievements: string[];
} {
  const progress = loadProgress();
  const today = dayKey();

  let streakIncreased = false;
  if (progress.lastPracticeDay !== today) {
    if (progress.lastPracticeDay && daysBetween(progress.lastPracticeDay, today) === 1) {
      progress.streak += 1;
    } else {
      // Gap >1: grace was already applied (or not) in loadProgress.
      // If grace was applied, the streak is still intact; otherwise it was reset.
      progress.streak = progress.streak > 0 ? progress.streak + 1 : 1;
    }
    progress.lastPracticeDay = today;
    streakIncreased = true;
  }

  const goalBefore = progress.todayXp >= DAILY_GOAL_XP;
  progress.xp += input.xp;
  progress.todayXp += input.xp;
  progress.todayDay = today;
  const goalReached = !goalBefore && progress.todayXp >= DAILY_GOAL_XP;

  const ex = progress.exercises[input.exerciseId] || {
    attempts: 0,
    bestScore: 0,
    lastScore: 0,
    lastDate: today,
  };
  ex.attempts += 1;
  ex.bestScore = Math.max(ex.bestScore, input.score);
  ex.lastScore = input.score;
  ex.lastDate = new Date().toISOString();
  progress.exercises[input.exerciseId] = ex;

  progress.history.unshift({
    id: `${input.exerciseId}-${Date.now()}`,
    exerciseId: input.exerciseId,
    date: new Date().toISOString(),
    score: input.score,
    xp: input.xp,
    wordCount: input.wordCount,
    dims: input.dims,
  });
  progress.history = progress.history.slice(0, 50);

  // Achievements are evaluated by the caller using evaluateAchievements from
  // lib/achievements.ts to avoid a circular import. We return an empty array
  // here as the hook; callers that import achievements can populate it.
  const newAchievements: string[] = [];

  return { progress: save(progress), streakIncreased, goalReached, newAchievements };
}

export function resetProgress(): Progress {
  return save({ ...EMPTY, todayDay: dayKey() });
}

export const dailyGoalXp = DAILY_GOAL_XP;

// ─────────────────── Per-dimension history ───────────────────

/**
 * Returns the last `n` (default 7) scores for a dimension from history,
 * oldest → newest, suitable for a sparkline chart.
 */
export function dimensionTrend(progress: Progress, dimension: string, n = 7): number[] {
  const scores: number[] = [];
  // history is stored newest-first; iterate in reverse to get oldest-first output.
  for (let i = progress.history.length - 1; i >= 0; i--) {
    const dims = progress.history[i].dims;
    if (dims && typeof dims[dimension] === 'number') {
      scores.push(dims[dimension] as number);
    }
  }
  return scores.slice(-n);
}

/**
 * Returns the most recent score for each dimension across history — used to
 * pass as `previous` to coachAttempt so the coach can show personal-baseline deltas.
 */
export function lastDimensionScores(progress: Progress): Partial<Record<string, number>> {
  const result: Partial<Record<string, number>> = {};
  // history is newest-first; the first entry with a given dimension wins.
  for (const attempt of progress.history) {
    if (!attempt.dims) continue;
    for (const [dim, score] of Object.entries(attempt.dims)) {
      if (!(dim in result) && typeof score === 'number') {
        result[dim] = score;
      }
    }
  }
  return result;
}

// ──────────────────────── Level / rank ────────────────────────

// XP thresholds: level L requires cumulative XP of xpForLevel(L).
// Using xpForLevel(L) = 75 * L * L so level 1≈75, level 5≈1875, level 10≈7500.
// Titles band every ~1.25 levels, giving 8 tiers by level 10.
const TITLES = [
  'Rookie',          // levels 1–2
  'Speaker',         // levels 3–4
  'Presenter',       // levels 5–6
  'Closer',          // level 7
  'Influencer',      // level 8
  'Strategist',      // level 9
  'Boardroom-ready', // level 10
  'Keynote',         // level 11+
] as const;

function xpForLevel(level: number): number {
  // Cumulative XP required to REACH `level` (level 1 starts at 0).
  return level <= 1 ? 0 : 75 * (level - 1) * (level - 1);
}

function titleFor(level: number): string {
  const idx = Math.min(TITLES.length - 1, Math.floor((level - 1) / 1.5));
  return TITLES[Math.max(0, idx)];
}

export function levelFor(xp: number): {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNext: number;
} {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const xpIntoLevel = xp - xpForLevel(level);
  const xpForNext = xpForLevel(level + 1) - xpForLevel(level);
  return { level, title: titleFor(level), xpIntoLevel, xpForNext };
}

// ─────────────────── Daily goal (reps-based) ─────────────────

/**
 * Load the user-configurable daily rep goal (default 1, allowed 1|2|3).
 * Separate from DAILY_GOAL_XP which is kept for back-compat.
 */
export function loadDailyGoalReps(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = window.localStorage.getItem(DAILY_GOAL_REPS_KEY);
    const n = raw ? parseInt(raw, 10) : 1;
    return [1, 2, 3].includes(n) ? n : 1;
  } catch {
    return 1;
  }
}

export function saveDailyGoalReps(n: number): void {
  if (typeof window === 'undefined') return;
  const safe = [1, 2, 3].includes(n) ? n : 1;
  try {
    window.localStorage.setItem(DAILY_GOAL_REPS_KEY, String(safe));
  } catch {
    /* storage full / unavailable */
  }
}

/** Count how many attempts the user has completed today. */
export function repsToday(progress: Progress): number {
  const today = dayKey();
  return progress.history.filter((a) => a.date.slice(0, 10) === today).length;
}

// ──────────────────── Pre-rep challenge key ───────────────────

/** Persist the dimension the user is focusing on this rep (the pre-rep challenge). */
export function saveLastChallenge(dim: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (dim === null) {
      window.localStorage.removeItem(LAST_CHALLENGE_KEY);
    } else {
      window.localStorage.setItem(LAST_CHALLENGE_KEY, dim);
    }
  } catch {
    /* storage full / unavailable */
  }
}

export function loadLastChallenge(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_CHALLENGE_KEY);
  } catch {
    return null;
  }
}
