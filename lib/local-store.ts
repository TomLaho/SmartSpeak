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

export interface AttemptRecord {
  id: string;
  exerciseId: string;
  date: string; // ISO
  score: number;
  xp: number;
  wordCount: number;
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
    // Break the streak if more than a day has passed without practice.
    if (parsed.lastPracticeDay && daysBetween(parsed.lastPracticeDay, dayKey()) > 1) {
      parsed.streak = 0;
    }
    return parsed;
  } catch {
    return { ...EMPTY };
  }
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
}

/** Records a completed take and returns the updated progress + streak deltas. */
export function recordAttempt(input: RecordInput): {
  progress: Progress;
  streakIncreased: boolean;
  goalReached: boolean;
} {
  const progress = loadProgress();
  const today = dayKey();

  let streakIncreased = false;
  if (progress.lastPracticeDay !== today) {
    if (progress.lastPracticeDay && daysBetween(progress.lastPracticeDay, today) === 1) {
      progress.streak += 1;
    } else {
      progress.streak = 1;
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
  });
  progress.history = progress.history.slice(0, 50);

  return { progress: save(progress), streakIncreased, goalReached };
}

export function resetProgress(): Progress {
  return save({ ...EMPTY, todayDay: dayKey() });
}

export const dailyGoalXp = DAILY_GOAL_XP;
