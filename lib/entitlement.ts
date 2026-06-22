'use client';

/**
 * Entitlement / monetization.
 *
 * SmartSpeak Pro is a one-time, non-consumable in-app purchase ($10) that unlocks
 * the full curriculum. Billing goes through Google Play via the TWA Digital
 * Goods API + Payment Request API — no backend, and the purchase is tied to the
 * user's Google account so it restores automatically on reinstall / new device.
 *
 * Everything is feature-detected: in a plain browser (no Play Billing) the
 * purchase path reports "unavailable" and the app still runs the free preview.
 *
 * Free preview: the first FREE_EXERCISE_LIMIT distinct exercises a user attempts
 * are free (and stay replayable); starting a further new exercise needs Pro.
 */

const PRODUCT_ID = 'pro_unlock';
const PLAY_BILLING = 'https://play.google.com/billing';
const KEY = 'smartspeak.pro.v1';

export const FREE_EXERCISE_LIMIT = 3;
export const PRO_PRICE = '$10';

function readFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function writeFlag(owned: boolean): void {
  try {
    if (owned) window.localStorage.setItem(KEY, '1');
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Synchronous, cached Pro state for first render. */
export function isProCached(): boolean {
  return readFlag();
}

/** True when the runtime can actually transact (i.e. inside the Play TWA). */
export function isPlayBillingAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).getDigitalGoodsService === 'function' &&
    typeof (window as any).PaymentRequest === 'function'
  );
}

async function getService(): Promise<any | null> {
  try {
    const getter = (window as any).getDigitalGoodsService;
    if (typeof getter !== 'function') return null;
    return await getter.call(window, PLAY_BILLING);
  } catch {
    return null;
  }
}

/**
 * Silent restore: ask Play whether this Google account already owns Pro and
 * refresh the cache. Resolves to the current entitlement (cached on failure).
 */
export async function refreshEntitlement(): Promise<boolean> {
  try {
    const service = await getService();
    if (!service?.listPurchases) return readFlag();
    const purchases = await service.listPurchases();
    const owned = Array.isArray(purchases) && purchases.some((p: any) => p?.itemId === PRODUCT_ID);
    writeFlag(owned);
    return owned;
  } catch {
    return readFlag();
  }
}

export type PurchaseResult = { ok: true } | { ok: false; reason: 'unavailable' | 'cancelled' | 'error' };

/** Launch the Google Play purchase flow for the Pro unlock. */
export async function purchasePro(): Promise<PurchaseResult> {
  if (!isPlayBillingAvailable()) return { ok: false, reason: 'unavailable' };
  try {
    const service = await getService();
    if (!service) return { ok: false, reason: 'unavailable' };

    const methodData = [{ supportedMethods: PLAY_BILLING, data: { sku: PRODUCT_ID } }];
    const request = new PaymentRequest(methodData as any, {
      total: { label: 'SmartSpeak Pro', amount: { currency: 'USD', value: '10.00' } },
    });
    const response: any = await request.show();
    const token: string | undefined = response?.details?.token;

    // Acknowledge so Play doesn't auto-refund the non-consumable after 3 days.
    // NOTE: confirm the right mechanism for your Digital Goods API version at
    // integration time (client `acknowledge`, or the Play Developer API). See
    // RELEASE.md.
    if (token && typeof service.acknowledge === 'function') {
      try {
        await service.acknowledge(token, 'onetime');
      } catch {
        /* acknowledgement may need to happen server-side */
      }
    }
    await response.complete('success');
    writeFlag(true);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: err?.name === 'AbortError' ? 'cancelled' : 'error' };
  }
}

/** Whether a given exercise is playable for this user. */
export function canAccessExercise(args: {
  pro: boolean;
  alreadyAttempted: boolean;
  distinctAttempted: number;
}): boolean {
  if (args.pro || args.alreadyAttempted) return true;
  return args.distinctAttempted < FREE_EXERCISE_LIMIT;
}

/**
 * Number of learning modules unlocked for free (by 1-based `order`). The rest
 * are shown locked — a visible curiosity gap that points at the Pro unlock.
 * Module 1 holds exactly FREE_EXERCISE_LIMIT exercises, so the free curriculum
 * and the free-rep allowance line up cleanly.
 */
export const FREE_MODULE_LIMIT = 1;

/** Whether a learning module is unlocked for this user. */
export function isModuleUnlocked(args: { pro: boolean; order: number }): boolean {
  return args.pro || args.order <= FREE_MODULE_LIMIT;
}

/** Free uses of the Open Mic free-play exercise for non-Pro users. */
export const FREE_PLAY_FREE_USES = 1;

/** Whether the user can access Open Mic. Pro users: unlimited; free users: one use. */
export function canAccessFreePlay(args: { pro: boolean; freePlayAttempts: number }): boolean {
  return args.pro || args.freePlayAttempts < FREE_PLAY_FREE_USES;
}
