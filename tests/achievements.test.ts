import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { installStorage, removeStorage, audioMetrics } from './helpers';

installStorage();

import {
  ACHIEVEMENTS,
  evaluateAchievements,
  loadUnlockedIds,
  loadUnlockedAchievements,
  type AchievementContext,
} from '@/lib/achievements';
import { coachAttempt } from '@/lib/coach';
import { EXERCISES, type Exercise } from '@/lib/exercises';
import { UNAVAILABLE_METRICS } from '@/lib/audio-dsp';
import type { Progress } from '@/lib/local-store';

const spoken = EXERCISES.find((e) => e.type !== 'read') as Exercise;
const SPEECH =
  'Last quarter we lost 12 hours a week to manual reconciliation. First we mapped every handoff, ' +
  'then we found the bottleneck sat in one spreadsheet. But the fix was small.';

function progressWith(overrides: Partial<Progress> = {}): Progress {
  return {
    xp: 0,
    streak: 0,
    lastPracticeDay: null,
    todayXp: 0,
    todayDay: null,
    exercises: {},
    history: [],
    ...overrides,
  };
}

function ctx(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    result: coachAttempt(spoken, SPEECH, audioMetrics()),
    progress: progressWith(),
    exerciseId: spoken.id,
    graceUsedThisSession: false,
    totalReps: 1,
    ...overrides,
  };
}

beforeEach(() => installStorage());
afterEach(() => removeStorage());

describe('registry', () => {
  it('has a unique id and complete copy for every achievement', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.name).toBeTruthy();
      expect(a.emoji).toBeTruthy();
      expect(a.description).toBeTruthy();
    }
  });
});

describe('unlocking', () => {
  it('awards First Rep on the first take', () => {
    expect(evaluateAchievements(ctx())).toContain('first-rep');
  });

  it('never awards the same achievement twice', () => {
    evaluateAchievements(ctx());
    expect(evaluateAchievements(ctx())).not.toContain('first-rep');
  });

  it('persists unlocks across reloads', () => {
    evaluateAchievements(ctx());
    expect(loadUnlockedIds().has('first-rep')).toBe(true);
    expect(loadUnlockedAchievements().map((a) => a.id)).toContain('first-rep');
  });

  it('awards Week Warrior at a 7-day streak, not before', () => {
    expect(evaluateAchievements(ctx({ progress: progressWith({ streak: 6 }) }))).not.toContain(
      'week-warrior'
    );
    installStorage();
    expect(evaluateAchievements(ctx({ progress: progressWith({ streak: 7 }) }))).toContain(
      'week-warrior'
    );
  });

  it('awards Marathon at 25 total reps', () => {
    expect(evaluateAchievements(ctx({ totalReps: 24 }))).not.toContain('marathon');
    installStorage();
    expect(evaluateAchievements(ctx({ totalReps: 25 }))).toContain('marathon');
  });

  it('awards Comeback only when a grace day was actually used', () => {
    expect(evaluateAchievements(ctx({ graceUsedThisSession: false }))).not.toContain('comeback');
    installStorage();
    expect(evaluateAchievements(ctx({ graceUsedThisSession: true }))).toContain('comeback');
  });

  it('awards Specialist only on a repeat attempt scoring 90+', () => {
    const firstTry = progressWith({
      exercises: { [spoken.id]: { attempts: 1, bestScore: 95, lastScore: 95, lastDate: '' } },
    });
    expect(evaluateAchievements(ctx({ progress: firstTry }))).not.toContain('specialist');
    installStorage();
    const repeat = progressWith({
      exercises: { [spoken.id]: { attempts: 2, bestScore: 95, lastScore: 95, lastDate: '' } },
    });
    expect(evaluateAchievements(ctx({ progress: repeat }))).toContain('specialist');
  });

  it('awards Explorer once all three tracks have been touched', () => {
    const oneEach = Object.fromEntries(
      ['delivery', 'structure', 'influence'].map((track) => [
        EXERCISES.find((e) => e.track === track)!.id,
        { attempts: 1, bestScore: 50, lastScore: 50, lastDate: '' },
      ])
    );
    expect(evaluateAchievements(ctx({ progress: progressWith({ exercises: oneEach }) }))).toContain(
      'explorer'
    );
  });
});

describe('measurement guards', () => {
  // An achievement must never be granted off a dimension the coach could not
  // measure — a silent or failed take is not a clean take.
  const unmeasured = () => coachAttempt(spoken, '', UNAVAILABLE_METRICS);

  it('does not award Filler-Free when fillers were never measured', () => {
    const result = unmeasured();
    expect(result.fillerCount).toBe(0); // the trap: zero because nothing was measured
    expect(result.scores.find((s) => s.dimension === 'fillers')?.measured).toBe(false);
    expect(evaluateAchievements(ctx({ result }))).not.toContain('filler-free');
  });

  it('still awards Filler-Free on a genuinely clean measured take', () => {
    const clean = coachAttempt(spoken, SPEECH, audioMetrics({ filledPauseCount: 0 }));
    expect(clean.scores.find((s) => s.dimension === 'fillers')?.measured).toBe(true);
    expect(evaluateAchievements(ctx({ result: clean }))).toContain('filler-free');
  });

  it('does not award Pace Zone or Structured when unmeasured', () => {
    const ids = evaluateAchievements(ctx({ result: unmeasured() }));
    expect(ids).not.toContain('pace-zone');
    expect(ids).not.toContain('structured');
  });
});

describe('Pace Zone matches its promise', () => {
  const paceIds = (wpm: number) => {
    installStorage();
    return evaluateAchievements(ctx({ result: coachAttempt(spoken, SPEECH, audioMetrics({ estimatedWpm: wpm })) }));
  };

  it('unlocks inside the advertised 130–160 wpm band', () => {
    expect(paceIds(130)).toContain('pace-zone');
    expect(paceIds(145)).toContain('pace-zone');
    expect(paceIds(160)).toContain('pace-zone');
  });

  it('does not unlock well outside the advertised band', () => {
    expect(paceIds(105)).not.toContain('pace-zone');
    expect(paceIds(195)).not.toContain('pace-zone');
  });
});
