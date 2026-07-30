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

/**
 * Public Play Store listing (package id from PLAY_LISTING.md). Purchases only
 * work inside the TWA, so surfaces without Play Billing send users here.
 *
 * STORE_LIVE gates every user-facing link to this URL: it 404s until the app
 * is published. Flip to true the day the listing goes live on Google Play.
 */
export const STORE_LIVE = false;
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.smartspeak.twa';

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
 * Whether Play actually has PRODUCT_ID listed, independent of ownership:
 * - 'available' — Play knows the product; the purchase flow can work.
 * - 'absent' — Play answered and has no such product (e.g. unverified
 *   payments profile). This is the ONLY state that grants the pre-launch
 *   grace below — everything else fails closed, because an error must
 *   never be the reason a user gets the paid tier for free.
 * - 'unknown' — no getDetails, a non-array response, or a thrown error.
 */
async function productState(service: any): Promise<'available' | 'absent' | 'unknown'> {
  try {
    if (typeof service?.getDetails !== 'function') return 'unknown';
    const details = await service.getDetails([PRODUCT_ID]);
    if (!Array.isArray(details)) return 'unknown';
    return details.length > 0 ? 'available' : 'absent';
  } catch {
    return 'unknown';
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
    if (owned) {
      writeFlag(true);
      return true;
    }
    if ((await productState(service)) === 'absent') {
      // Pre-launch grace: Play Billing is present but pro_unlock doesn't exist
      // in the Play Console yet, so the purchase flow would reject every tap
      // and lock testers out of the app entirely. Grant Pro until the product
      // goes live — this reverts itself automatically the moment it does.
      writeFlag(true);
      return true;
    }
    writeFlag(false);
    return false;
  } catch {
    return readFlag();
  }
}

/**
 * Store-formatted price of the Pro unlock from Play (e.g. "$14.99" in the
 * buyer's local currency), or null outside the TWA / on any failure. Play's
 * console price is authoritative — PRO_PRICE is the display fallback.
 */
export async function getProPrice(): Promise<string | null> {
  try {
    const service = await getService();
    if (!service?.getDetails) return null;
    const details = await service.getDetails([PRODUCT_ID]);
    const amount = details?.[0]?.price;
    if (!amount?.value || !amount?.currency) return null;
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: amount.currency }).format(Number(amount.value));
  } catch {
    return null;
  }
}

export type PurchaseResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'cancelled' | 'error' | 'not-yet-available' };

/** Launch the Google Play purchase flow for the Pro unlock. */
export async function purchasePro(): Promise<PurchaseResult> {
  if (!isPlayBillingAvailable()) return { ok: false, reason: 'unavailable' };
  try {
    const service = await getService();
    if (!service) return { ok: false, reason: 'unavailable' };
    // Defence in depth: a tap can race the mount-time refreshEntitlement() call.
    if ((await productState(service)) === 'absent') return { ok: false, reason: 'not-yet-available' };

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

/** Free uses of the Open Mic free-play exercise per rolling 7-day window. */
export const FREE_PLAY_FREE_USES = 1;

/**
 * Whether the user can access Open Mic. Pro users: unlimited. Free users get
 * FREE_PLAY_FREE_USES uses, then recharge once 7 full days have passed since
 * their last free-play attempt.
 */
export function canAccessFreePlay(args: {
  pro: boolean;
  freePlayAttempts: number;
  lastFreePlayDate?: string | null;
}): boolean {
  if (args.pro || args.freePlayAttempts === 0) return true;
  if (!args.lastFreePlayDate) return false;
  const daysSince = (Date.now() - new Date(args.lastFreePlayDate).getTime()) / 86400000;
  return isFinite(daysSince) && daysSince >= 7;
}
