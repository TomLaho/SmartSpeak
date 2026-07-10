'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/brand/logo';
import { EXERCISES, FREE_PLAY_ID } from '@/lib/exercises';
import { loadProgress } from '@/lib/local-store';
import {
  PRO_PRICE,
  PLAY_STORE_URL,
  STORE_LIVE,
  FREE_EXERCISE_LIMIT,
  isProCached,
  isPlayBillingAvailable,
  purchasePro,
  refreshEntitlement,
  getProPrice,
} from '@/lib/entitlement';

const PERKS = [
  `All ${EXERCISES.length} work-scenario reps across Delivery, Structure and Influence`,
  'Self-review playback with the delivery timeline',
  'On-device coaching on pace, pauses, tone, volume & fillers',
  'Keep your streak, XP and full progress history',
];

export default function UnlockPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // null = not yet detected — renders the purchase CTA disabled for a frame so
  // TWA users never see a flash of the wrong (Play-Store-link) button.
  const [billing, setBilling] = useState<boolean | null>(null);
  const [freeRepsLeft, setFreeRepsLeft] = useState<number | null>(null);
  const [price, setPrice] = useState<string>(PRO_PRICE);

  useEffect(() => {
    setBilling(isPlayBillingAvailable());
    getProPrice().then((p) => p && setPrice(p));
    // Honest headline copy: how much of the free preview is actually used?
    const p = loadProgress();
    const used = Object.entries(p.exercises).filter(
      ([id, e]) => e.attempts > 0 && id !== FREE_PLAY_ID
    ).length;
    setFreeRepsLeft(Math.max(0, FREE_EXERCISE_LIMIT - used));
    // If they already own it (e.g. reinstalled), send them straight in.
    if (isProCached()) router.replace('/train');
    else refreshEntitlement().then((pro) => pro && router.replace('/train'));
  }, [router]);

  const unlock = async () => {
    setMessage(null);
    setBusy(true);
    const res = await purchasePro();
    setBusy(false);
    if (res.ok) {
      router.replace('/train');
    } else if (res.reason === 'unavailable') {
      setMessage('In-app purchase is available in the SmartSpeak app on Google Play.');
    } else if (res.reason === 'error') {
      setMessage('Something went wrong with the purchase. Please try again.');
    }
  };

  const restore = async () => {
    setMessage(null);
    setBusy(true);
    const pro = await refreshEntitlement();
    setBusy(false);
    if (pro) router.replace('/train');
    else setMessage('No previous purchase found on this Google account.');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col px-6 pb-10 pt-10">
      <div className="flex flex-1 flex-col items-center text-center">
        <LogoMark size={56} className="rounded-[24%]" />
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-spotlight">SmartSpeak Pro</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">Unlock the full coach</h1>
        <p className="mt-2 max-w-sm text-white/60">
          {freeRepsLeft !== null && freeRepsLeft > 0
            ? `You still have ${freeRepsLeft} free rep${freeRepsLeft === 1 ? '' : 's'} — and Pro unlocks every scenario whenever you're ready.`
            : "You've used your free practice reps. Unlock every scenario and keep training for your real meetings."}
        </p>

        <ul className="mt-7 w-full max-w-sm space-y-3 text-left">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-spotlight/20 text-xs text-spotlight">
                ✓
              </span>
              <span className="text-sm text-white/75">{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 w-full max-w-sm rounded-2xl border border-spotlight/30 bg-spotlight/10 p-4">
          <p className="text-2xl font-bold">
            {price} <span className="text-sm font-normal text-white/55">· one-time · yours forever</span>
          </p>
          <p className="mt-1 text-xs text-white/45">No subscription. Pay once, unlock on every device on your account.</p>
          <p className="mt-1 text-xs text-white/45">A speaking coach runs $100+ an hour.</p>
        </div>

        {message && <p className="mt-4 max-w-sm text-sm text-amber-300">{message}</p>}
        {billing === false && !message && (
          <p className="mt-4 max-w-sm text-xs text-white/40">
            {STORE_LIVE
              ? 'Pro is purchased inside the SmartSpeak Android app — free to install, pay once inside.'
              : 'Heads up: purchasing requires the SmartSpeak app from Google Play.'}
          </p>
        )}
      </div>

      <div className="mx-auto w-full max-w-sm space-y-3">
        {billing === false && STORE_LIVE ? (
          // No Play Billing here (plain browser / installed PWA): bridge to the
          // store listing instead of a purchase button that cannot work.
          <Button
            asChild
            size="lg"
            className="h-14 w-full rounded-2xl bg-spotlight text-ink text-base font-semibold hover:bg-spotlight-soft"
          >
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
              Get SmartSpeak on Google Play
            </a>
          </Button>
        ) : billing === false ? (
          // Store not live yet: keep the honest hint above, no dead affordance.
          <Button
            disabled
            size="lg"
            className="h-14 w-full rounded-2xl bg-spotlight text-ink text-base font-semibold disabled:opacity-60"
          >
            Unlock for {PRO_PRICE}
          </Button>
        ) : (
          <>
            <Button
              onClick={unlock}
              disabled={busy || billing === null}
              size="lg"
              className="h-14 w-full rounded-2xl bg-spotlight text-ink text-base font-semibold hover:bg-spotlight-soft disabled:opacity-60"
            >
              {busy ? 'Please wait…' : `Unlock for ${price}`}
            </Button>
            <button
              onClick={restore}
              disabled={busy}
              className="w-full py-1 text-sm text-white/55 hover:text-white/80 disabled:opacity-60"
            >
              Restore purchase
            </button>
          </>
        )}
        <Link href="/train" className="block w-full py-1 text-center text-sm text-white/40 hover:text-white/60">
          Not now
        </Link>
      </div>
    </div>
  );
}
