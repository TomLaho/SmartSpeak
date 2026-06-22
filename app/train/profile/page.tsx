'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadProgress, resetProgress, loadDailyGoalReps, saveDailyGoalReps, levelFor, type Progress } from '@/lib/local-store';
import { isProCached, refreshEntitlement, PRO_PRICE } from '@/lib/entitlement';
import { Button } from '@/components/ui/button';
import { MicCalibration } from '@/components/train/mic-calibration';
import { cn } from '@/lib/utils';

const REP_OPTIONS = [1, 2, 3] as const;

export default function ProfilePage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pro, setPro] = useState(false);
  const [dailyGoalReps, setDailyGoalReps] = useState<number>(1);

  useEffect(() => {
    setProgress(loadProgress());
    setPro(isProCached());
    refreshEntitlement().then(setPro);
    setDailyGoalReps(loadDailyGoalReps());
  }, []);

  function handleGoalChange(n: number) {
    saveDailyGoalReps(n);
    setDailyGoalReps(n);
  }

  const level = levelFor(progress?.xp ?? 0);

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="mb-5 text-2xl font-bold">Profile</h1>

      {/* Identity card — avatar + title evolve with the user's level */}
      <div className="mb-6 flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-spotlight/30 bg-gradient-to-br from-spotlight/30 to-spotlight/5 text-3xl">
          {level.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold text-white">{level.title}</p>
            <span className="shrink-0 rounded-full bg-spotlight/15 px-2 py-0.5 text-xs font-semibold text-spotlight">
              Lv {level.level}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/70">
            {(progress?.xp ?? 0).toLocaleString()} XP · 🔥 {progress?.streak ?? 0} day streak
          </p>
        </div>
      </div>

      {/* Daily goal selector */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-3 font-semibold text-white/80">Daily goal</p>
        <div className="flex gap-2">
          {REP_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => handleGoalChange(n)}
              aria-pressed={dailyGoalReps === n}
              className={cn(
                'flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                dailyGoalReps === n
                  ? 'bg-spotlight text-ink'
                  : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'
              )}
            >
              {n} rep{n === 1 ? '' : 's'}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-white/35">
          {dailyGoalReps === 1
            ? 'One rep a day builds the habit.'
            : dailyGoalReps === 2
            ? 'Two reps accelerates your improvement.'
            : 'Three reps per day is serious training.'}
        </p>
      </div>

      {/* Privacy note */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
        <p className="font-semibold text-white/80">🔒 Private by design</p>
        <p className="mt-1">
          You&apos;re practising with <span className="text-white/80">no account and no server</span>. Your voice is
          analysed entirely on your device and never uploaded — your progress is saved privately in this browser.
        </p>
        <p className="mt-2">
          Transcription runs <span className="text-stage">on-device</span> — your words are transcribed from the
          recording locally (a small speech model downloads once, then works offline).
        </p>
      </div>

      <MicCalibration />

      {/* Pro / unlock */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-white/80">{pro ? '✓ SmartSpeak Pro' : 'SmartSpeak Pro'}</p>
            <p className="mt-1 text-sm text-white/55">
              {pro
                ? 'All reps unlocked — thanks for your support!'
                : `Unlock all 15 work-scenario reps · ${PRO_PRICE}, one-time.`}
            </p>
          </div>
          {pro && (
            <span className="shrink-0 rounded-full bg-stage/15 px-2.5 py-1 text-xs font-semibold text-stage">
              Unlocked
            </span>
          )}
        </div>
        {!pro && (
          <div className="mt-3 flex gap-2">
            <Button asChild className="h-10 rounded-xl bg-spotlight text-ink hover:bg-spotlight/90">
              <Link href="/train/unlock">Unlock {PRO_PRICE}</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={async () => setPro(await refreshEntitlement())}
              className="h-10 rounded-xl text-white/60 hover:bg-white/10 hover:text-white/80"
            >
              Restore
            </Button>
          </div>
        )}
      </div>

      {/* Navigation links */}
      <div className="space-y-3">
        <Button asChild variant="secondary" className="h-12 w-full justify-between rounded-2xl bg-white/10 hover:bg-white/20">
          <Link href="/train">
            <span>🎯 Today&apos;s session</span>
            <span className="text-white/40">›</span>
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-12 w-full justify-between rounded-2xl bg-white/10 hover:bg-white/20">
          <Link href="/">
            <span>ℹ️ About SmartSpeak</span>
            <span className="text-white/40">›</span>
          </Link>
        </Button>

        {!confirming ? (
          <Button
            onClick={() => setConfirming(true)}
            variant="ghost"
            className="h-12 w-full rounded-2xl text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            Reset all progress
          </Button>
        ) : (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-white/80">Reset your streak, XP and history? This can&apos;t be undone.</p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => {
                  setProgress(resetProgress());
                  setConfirming(false);
                }}
                className="flex-1 bg-red-500 hover:bg-red-400"
              >
                Reset
              </Button>
              <Button onClick={() => setConfirming(false)} variant="secondary" className="flex-1 bg-white/10 hover:bg-white/20">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
