import { describe, expect, it } from 'vitest';
import { setupState, type SetupInput } from '@/lib/setup';

const base: SetupInput = {
  goalChosen: false,
  totalReps: 0,
  calibrated: false,
  reminderSet: false,
  firstRepHref: '/train',
};

describe('setupState', () => {
  it('reports zero only before first-run is completed', () => {
    const s = setupState(base);
    expect(s.doneCount).toBe(0);
    expect(s.pct).toBe(0);
    expect(s.complete).toBe(false);
  });

  it('starts a freshly onboarded user part-way through, never at zero', () => {
    // The goal-gradient guarantee: completing first-run credits a real step,
    // so the checklist a new user first sees is already moving.
    const s = setupState({ ...base, goalChosen: true });
    expect(s.doneCount).toBe(1);
    expect(s.pct).toBe(25);
    expect(s.pct).toBeGreaterThan(0);
  });

  it('credits each completed action exactly once', () => {
    expect(setupState({ ...base, goalChosen: true, totalReps: 1 }).pct).toBe(50);
    expect(setupState({ ...base, goalChosen: true, totalReps: 12, calibrated: true }).pct).toBe(75);
  });

  it('is complete only when every step is done', () => {
    const s = setupState({
      goalChosen: true,
      totalReps: 3,
      calibrated: true,
      reminderSet: true,
      firstRepHref: '/train',
    });
    expect(s.complete).toBe(true);
    expect(s.pct).toBe(100);
  });

  it('points the first-rep step at the caller-supplied exercise', () => {
    const s = setupState({ ...base, firstRepHref: '/train/exercise/d1-pace' });
    expect(s.steps.find((x) => x.id === 'first-rep')?.href).toBe('/train/exercise/d1-pace');
  });

  it('marks the first rep done off any recorded take', () => {
    const s = setupState({ ...base, totalReps: 1 });
    expect(s.steps.find((x) => x.id === 'first-rep')?.done).toBe(true);
  });
});
