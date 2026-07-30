import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  canAccessExercise,
  canAccessFreePlay,
  isModuleUnlocked,
  isProCached,
  refreshEntitlement,
  FREE_EXERCISE_LIMIT,
  FREE_MODULE_LIMIT,
} from '@/lib/entitlement';
import { EXERCISES, MODULES, exercisesByModule, type ModuleId } from '@/lib/exercises';
import { installStorage, removeStorage } from './helpers';

afterEach(() => vi.useRealTimers());

/** Installs a fake Play Billing service (and backing storage) for one test. */
function installBillingService(service: {
  listPurchases?: () => Promise<any>;
  getDetails?: (ids: string[]) => Promise<any>;
}): void {
  installStorage();
  (window as any).getDigitalGoodsService = async () => service;
}

describe('canAccessExercise', () => {
  it('lets a free user open exactly FREE_EXERCISE_LIMIT distinct exercises', () => {
    for (let n = 0; n < FREE_EXERCISE_LIMIT; n++) {
      expect(canAccessExercise({ pro: false, alreadyAttempted: false, distinctAttempted: n })).toBe(true);
    }
    expect(
      canAccessExercise({ pro: false, alreadyAttempted: false, distinctAttempted: FREE_EXERCISE_LIMIT })
    ).toBe(false);
  });

  it('keeps already-attempted exercises replayable after the limit', () => {
    expect(canAccessExercise({ pro: false, alreadyAttempted: true, distinctAttempted: 99 })).toBe(true);
  });

  it('gives Pro users everything', () => {
    expect(canAccessExercise({ pro: true, alreadyAttempted: false, distinctAttempted: 99 })).toBe(true);
  });
});

describe('isModuleUnlocked', () => {
  it('unlocks only the first module for free users', () => {
    expect(isModuleUnlocked({ pro: false, order: FREE_MODULE_LIMIT })).toBe(true);
    expect(isModuleUnlocked({ pro: false, order: FREE_MODULE_LIMIT + 1 })).toBe(false);
    expect(isModuleUnlocked({ pro: true, order: 99 })).toBe(true);
  });
});

describe('free curriculum invariant', () => {
  it('the free module holds exactly the number of free rep slots', () => {
    // If these drift apart, a free user either runs out of reps mid-module or
    // finishes the free module with unspent slots and nowhere to spend them.
    const freeModules = MODULES.filter((m) => m.order <= FREE_MODULE_LIMIT);
    const freeExercises = freeModules.flatMap((m) => exercisesByModule(m.id as ModuleId));
    expect(freeExercises).toHaveLength(FREE_EXERCISE_LIMIT);
  });

  it('every exercise is reachable from exactly one module', () => {
    const mapped = MODULES.flatMap((m) => exercisesByModule(m.id as ModuleId)).map((e) => e.id);
    expect(new Set(mapped).size).toBe(mapped.length); // no exercise in two modules
    expect(new Set(mapped)).toEqual(new Set(EXERCISES.map((e) => e.id)));
  });
});

describe('canAccessFreePlay', () => {
  const day = 86400000;

  it('grants the first use to a free user', () => {
    expect(canAccessFreePlay({ pro: false, freePlayAttempts: 0 })).toBe(true);
  });

  it('locks the second use inside the 7-day window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 8));
    const threeDaysAgo = new Date(Date.now() - 3 * day).toISOString();
    expect(canAccessFreePlay({ pro: false, freePlayAttempts: 1, lastFreePlayDate: threeDaysAgo })).toBe(
      false
    );
  });

  it('recharges once 7 full days have passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 8));
    const sevenDaysAgo = new Date(Date.now() - 7 * day).toISOString();
    expect(canAccessFreePlay({ pro: false, freePlayAttempts: 1, lastFreePlayDate: sevenDaysAgo })).toBe(
      true
    );
  });

  it('stays locked when the stored date is missing or unparseable', () => {
    expect(canAccessFreePlay({ pro: false, freePlayAttempts: 1, lastFreePlayDate: null })).toBe(false);
    expect(canAccessFreePlay({ pro: false, freePlayAttempts: 1, lastFreePlayDate: 'not-a-date' })).toBe(
      false
    );
  });

  it('is unlimited for Pro users', () => {
    expect(canAccessFreePlay({ pro: true, freePlayAttempts: 50, lastFreePlayDate: null })).toBe(true);
  });
});

describe('refreshEntitlement', () => {
  afterEach(() => removeStorage());

  it('grants Pro when Play reports the purchase as owned', async () => {
    installBillingService({ listPurchases: async () => [{ itemId: 'pro_unlock' }] });
    await expect(refreshEntitlement()).resolves.toBe(true);
  });

  it('grants the pre-launch grace when the product does not exist in Play yet', async () => {
    installBillingService({ listPurchases: async () => [], getDetails: async () => [] });
    await expect(refreshEntitlement()).resolves.toBe(true);
    expect(isProCached()).toBe(true);
  });

  it('still paywalls once the product is real but unowned', async () => {
    installBillingService({
      listPurchases: async () => [],
      getDetails: async () => [{ itemId: 'pro_unlock', price: { value: '10.00', currency: 'USD' } }],
    });
    await expect(refreshEntitlement()).resolves.toBe(false);
  });

  it('fails closed when getDetails throws', async () => {
    installBillingService({
      listPurchases: async () => [],
      getDetails: async () => {
        throw new Error('network error');
      },
    });
    await expect(refreshEntitlement()).resolves.toBe(false);
    expect(isProCached()).toBe(false);
  });

  it('fails closed when getDetails returns a non-array', async () => {
    installBillingService({ listPurchases: async () => [], getDetails: async () => undefined });
    await expect(refreshEntitlement()).resolves.toBe(false);
  });
});
