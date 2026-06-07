'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/brand/logo';
import {
  PRO_PRICE,
  isProCached,
  isPlayBillingAvailable,
  purchasePro,
  refreshEntitlement,
} from '@/lib/entitlement';

const PERKS = [
  'All 15 work-scenario reps across Delivery, Structure and Influence',
  'Self-review playback with the delivery timeline',
  'On-device coaching on pace, pauses, tone, volume & fillers',
  'Keep your streak, XP and full progress history',
];

export default function UnlockPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [billing, setBilling] = useState(false);

  useEffect(() => {
    setBilling(isPlayBillingAvailable());
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
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-violet-300">SmartSpeak Pro</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">Unlock the full coach</h1>
        <p className="mt-2 max-w-sm text-white/60">
          You&apos;ve used your free practice reps. Unlock every scenario and keep training for your real meetings.
        </p>

        <ul className="mt-7 w-full max-w-sm space-y-3 text-left">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs text-violet-300">
                ✓
              </span>
              <span className="text-sm text-white/75">{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 w-full max-w-sm rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
          <p className="text-2xl font-bold">
            {PRO_PRICE} <span className="text-sm font-normal text-white/55">· one-time · yours forever</span>
          </p>
          <p className="mt-1 text-xs text-white/45">No subscription. Pay once, unlock on every device on your account.</p>
        </div>

        {message && <p className="mt-4 max-w-sm text-sm text-amber-300">{message}</p>}
        {!billing && !message && (
          <p className="mt-4 max-w-sm text-xs text-white/40">
            Heads up: purchasing requires the SmartSpeak app from Google Play.
          </p>
        )}
      </div>

      <div className="mx-auto w-full max-w-sm space-y-3">
        <Button
          onClick={unlock}
          disabled={busy}
          size="lg"
          className="h-14 w-full rounded-2xl bg-violet-600 text-base hover:bg-violet-500 disabled:opacity-60"
        >
          {busy ? 'Please wait…' : `Unlock for ${PRO_PRICE}`}
        </Button>
        <button
          onClick={restore}
          disabled={busy}
          className="w-full py-1 text-sm text-white/55 hover:text-white/80 disabled:opacity-60"
        >
          Restore purchase
        </button>
        <Link href="/train" className="block w-full py-1 text-center text-sm text-white/40 hover:text-white/60">
          Not now
        </Link>
      </div>
    </div>
  );
}
