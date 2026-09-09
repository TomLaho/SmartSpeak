import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { installStorage, removeStorage } from './helpers';

installStorage();

import {
  dayKey,
  loadProgress,
  recordAttempt,
  repsToday,
  resetProgress,
  levelFor,
  saveDailyGoalReps,
  loadDailyGoalReps,
  dimensionTrend,
  lastDimensionScores,
  type Progress,
} from '@/lib/local-store';

const KEY = 'smartspeak.progress.v1';

/** Write a progress object straight to storage, bypassing the module's writers. */
function seed(progress: Partial<Progress>): void {
  const full: Progress = {
    xp: 0,
    streak: 0,
    lastPracticeDay: null,
    todayXp: 0,
    todayDay: null,
    exercises: {},
    history: [],
    ...progress,
  };
  (globalThis as any).window.localStorage.setItem(KEY, JSON.stringify(full));
}

function rep(overrides: Partial<Parameters<typeof recordAttempt>[0]> = {}) {
  return recordAttempt({ exerciseId: 'd1-pace', score: 70, xp: 20, wordCount: 100, ...overrides });
}

beforeEach(() => {
  installStorage();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  removeStorage();
});

describe('dayKey', () => {
  it('uses the local calendar date, not the UTC one', () => {
    // 1am on the 8th in UTC+10 is 15:00Z on the 7th. The local day must win,
    // otherwise early-morning reps in AEST land on the previous day.
    vi.setSystemTime(new Date('2026-03-08T01:00:00+10:00'));
    const local = new Date();
    expect(dayKey(local)).toBe(
      `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(
        local.getDate()
      ).padStart(2, '0')}`
    );
  });

  it('zero-pads month and day', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('repsToday', () => {
  it('counts an attempt recorded earlier the same local day', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 1, 0, 0)); // 1am local
    const { progress } = rep();
    expect(repsToday(progress)).toBe(1);
  });

  it('does not count yesterday’s attempts', () => {
    vi.setSystemTime(new Date(2026, 2, 7, 9, 0, 0));
    rep();
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    expect(repsToday(loadProgress())).toBe(0);
  });
});

describe('streak', () => {
  it('starts at 1 on the first ever rep', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    const { progress, streakIncreased } = rep();
    expect(progress.streak).toBe(1);
    expect(streakIncreased).toBe(true);
  });

  it('increments on consecutive days', () => {
    vi.setSystemTime(new Date(2026, 2, 7, 9, 0, 0));
    rep();
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    expect(rep().progress.streak).toBe(2);
  });

  it('does not increment twice in one day', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    rep();
    const second = rep();
    expect(second.progress.streak).toBe(1);
    expect(second.streakIncreased).toBe(false);
  });

  it('resets after a gap of 3+ days', () => {
    seed({ streak: 5, lastPracticeDay: '2026-03-01' });
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    expect(loadProgress().streak).toBe(0);
  });
});

describe('grace day', () => {
  it('preserves the streak across a single missed day', () => {
    seed({ streak: 5, lastPracticeDay: '2026-03-06' });
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0)); // gap of exactly 2
    const loaded = loadProgress();
    expect(loaded.streak).toBe(5);
    expect(loaded.graceUsedDay).toBe('2026-03-08');
  });

  it('survives repeated loads on the grace day', () => {
    // Regression: the player loads progress several times per take. A second
    // load used to see the grace as "already used" and wipe the streak to 0.
    seed({ streak: 5, lastPracticeDay: '2026-03-06' });
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    loadProgress();
    loadProgress();
    expect(loadProgress().streak).toBe(5);
    expect(rep().progress.streak).toBe(6);
  });

  it('is not granted twice inside 7 days', () => {
    seed({ streak: 5, lastPracticeDay: '2026-03-06', graceUsedDay: '2026-03-04' });
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    expect(loadProgress().streak).toBe(0);
  });

  it('is granted again once 7 days have passed', () => {
    seed({ streak: 5, lastPracticeDay: '2026-03-06', graceUsedDay: '2026-03-01' });
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    expect(loadProgress().streak).toBe(5);
  });
});

describe('goalReached', () => {
  it('fires on the rep that crosses the goal, and only that one', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    saveDailyGoalReps(2);
    expect(rep().goalReached).toBe(false); // 0 → 1
    expect(rep().goalReached).toBe(true); // 1 → 2, crossing
    expect(rep().goalReached).toBe(false); // 2 → 3, already past
  });

  it('fires on the first rep when the goal is 1', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    saveDailyGoalReps(1);
    expect(rep().goalReached).toBe(true);
  });
});

describe('daily goal setting', () => {
  it('round-trips the allowed values', () => {
    saveDailyGoalReps(3);
    expect(loadDailyGoalReps()).toBe(3);
  });

  it('falls back to 1 for values outside 1|2|3', () => {
    saveDailyGoalReps(9);
    expect(loadDailyGoalReps()).toBe(1);
  });
});

describe('corrupt storage', () => {
  it('returns empty progress for unparseable JSON', () => {
    (globalThis as any).window.localStorage.setItem(KEY, '{not json');
    expect(loadProgress().streak).toBe(0);
  });

  it('clamps negative and non-finite counters', () => {
    seed({ xp: -50, streak: -3, todayXp: Number.POSITIVE_INFINITY });
    const p = loadProgress();
    expect(p.xp).toBe(0);
    expect(p.streak).toBe(0);
    expect(p.todayXp).toBe(0);
  });

  it('does not hang levelFor on a corrupt xp value', () => {
    expect(levelFor(Number.POSITIVE_INFINITY).level).toBe(1);
    expect(levelFor(-1).level).toBe(1);
  });
});

describe('blank-state isolation', () => {
  // Regression: the blank progress object used to be a shared module constant,
  // and `recordAttempt` mutates `history`/`exercises` in place. One rep would
  // therefore pollute "blank" for the rest of the session — so a reset, or a
  // recovery from corrupt storage, handed back the old data.
  it('does not leak a recorded attempt into the next blank load', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    rep();
    (globalThis as any).window.localStorage.removeItem(KEY);
    const blank = loadProgress();
    expect(blank.history).toEqual([]);
    expect(blank.exercises).toEqual({});
  });

  it('recovers to genuinely empty progress from corrupt storage', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    rep();
    (globalThis as any).window.localStorage.setItem(KEY, '{not json');
    expect(loadProgress().history).toEqual([]);
  });
});

describe('recordAttempt bookkeeping', () => {
  it('tracks best score independently of the latest score', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    rep({ score: 88 });
    const { progress } = rep({ score: 40 });
    expect(progress.exercises['d1-pace'].bestScore).toBe(88);
    expect(progress.exercises['d1-pace'].lastScore).toBe(40);
    expect(progress.exercises['d1-pace'].attempts).toBe(2);
  });

  it('caps history at 50 entries, newest first', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    for (let i = 0; i < 55; i++) rep({ score: i });
    const { history } = loadProgress();
    expect(history).toHaveLength(50);
    expect(history[0].score).toBe(54);
  });
});

describe('level curve', () => {
  it('starts at level 1 with the Rookie title', () => {
    const l = levelFor(0);
    expect(l.level).toBe(1);
    expect(l.title).toBe('Rookie');
    expect(l.xpIntoLevel).toBe(0);
  });

  it('is monotonic in xp', () => {
    let previous = 0;
    for (const xp of [0, 74, 75, 300, 1875, 7500, 50000]) {
      const level = levelFor(xp).level;
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it('never reports more xp into a level than the level is wide', () => {
    for (const xp of [0, 100, 1000, 5000, 20000]) {
      const l = levelFor(xp);
      expect(l.xpIntoLevel).toBeLessThan(l.xpForNext);
    }
  });
});

describe('dimension history', () => {
  it('returns a trend oldest-first, restricted to one exercise', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    rep({ dims: { pace: 50 } });
    rep({ exerciseId: 'other', dims: { pace: 99 } });
    const { progress } = rep({ dims: { pace: 80 } });
    expect(dimensionTrend(progress, 'pace', 7, 'd1-pace')).toEqual([50, 80]);
  });

  it('takes the most recent score per dimension', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    rep({ dims: { pace: 50, hook: 60 } });
    const { progress } = rep({ dims: { pace: 90 } });
    expect(lastDimensionScores(progress)).toEqual({ pace: 90, hook: 60 });
  });
});

describe('resetProgress', () => {
  it('clears everything but keeps today’s day key', () => {
    vi.setSystemTime(new Date(2026, 2, 8, 9, 0, 0));
    rep();
    const cleared = resetProgress();
    expect(cleared.xp).toBe(0);
    expect(cleared.history).toEqual([]);
    expect(cleared.todayDay).toBe('2026-03-08');
    expect(loadProgress().streak).toBe(0);
  });

  it('sweeps every smartspeak.* key — achievements, setup flags and progress together', () => {
    const storage = (globalThis as any).window.localStorage;
    // Seed keys the way their owning modules would, without importing them
    // (that would risk the exact circular import the prefix sweep avoids).
    storage.setItem('smartspeak.achievements.v1', JSON.stringify(['first-rep']));
    storage.setItem('smartspeak.onboarded.v1', '1');
    storage.setItem('smartspeak.reminderSet.v1', '1');
    storage.setItem('smartspeak.moment.v1', 'pitch');
    storage.setItem('smartspeak.pro.v1', '1');
    storage.setItem('unrelated.other-app.v1', 'should-survive');
    rep();

    resetProgress();

    expect(storage.getItem('smartspeak.achievements.v1')).toBeNull();
    expect(storage.getItem('smartspeak.onboarded.v1')).toBeNull();
    expect(storage.getItem('smartspeak.reminderSet.v1')).toBeNull();
    expect(storage.getItem('smartspeak.moment.v1')).toBeNull();
    expect(storage.getItem('smartspeak.pro.v1')).toBeNull();
    // A prefix sweep must not reach outside its own namespace.
    expect(storage.getItem('unrelated.other-app.v1')).toBe('should-survive');
  });
});
