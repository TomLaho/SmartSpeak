'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSpeechRecognitionSupported } from '@/lib/speech-recognition';
import { loadProgress, resetProgress, type Progress } from '@/lib/local-store';
import { isProCached, refreshEntitlement, PRO_PRICE } from '@/lib/entitlement';
import { Button } from '@/components/ui/button';
import { MicCalibration } from '@/components/train/mic-calibration';

export default function ProfilePage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [speech, setSpeech] = useState<boolean | null>(null);
  const [pro, setPro] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setSpeech(isSpeechRecognitionSupported());
    setPro(isProCached());
    refreshEntitlement().then(setPro);
  }, []);

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="mb-5 text-2xl font-bold">Profile</h1>

      <div className="mb-6 flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-2xl">
          🗣️
        </div>
        <div>
          <p className="font-semibold">Presenter</p>
          <p className="text-sm text-white/55">
            {(progress?.xp ?? 0).toLocaleString()} XP · 🔥 {progress?.streak ?? 0} day streak
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        <p className="font-semibold text-white/80">🔒 Private by design</p>
        <p className="mt-1">
          You&apos;re practising with <span className="text-white/80">no account and no server</span>. Your voice is
          analysed entirely on your device and never uploaded — your progress is saved privately in this browser.
        </p>
        <p className="mt-2">
          Transcription runs <span className="text-green-300">on-device</span> — your words are transcribed from the
          recording locally{speech ? ', with live captions while you speak.' : ' (a small speech model downloads once, then works offline).'}
        </p>
      </div>

      <MicCalibration />

      {/* Pro / unlock */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
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
            <span className="shrink-0 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-300">
              Unlocked
            </span>
          )}
        </div>
        {!pro && (
          <div className="mt-3 flex gap-2">
            <Button asChild className="h-10 rounded-xl bg-violet-600 hover:bg-violet-500">
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
