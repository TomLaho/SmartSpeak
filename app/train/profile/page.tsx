'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClockIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  CheckIcon,
  FireIcon,
  MicrophoneIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { loadProgress, resetProgress, loadDailyGoalReps, saveDailyGoalReps, levelFor, type Progress } from '@/lib/local-store';
import { isProCached, refreshEntitlement, PRO_PRICE } from '@/lib/entitlement';
import { GOOGLE_CALENDAR_REMINDER_URL, downloadPracticeReminderIcs } from '@/lib/reminder';
import { MOMENTS, loadMoment, saveMoment, getMoment, type MomentId } from '@/lib/personalise';
import { markReminderSet, isReminderSet } from '@/lib/setup';
import { EXERCISES, getModule } from '@/lib/exercises';
import { Button } from '@/components/ui/button';
import { MicCalibration } from '@/components/train/mic-calibration';
import { cn } from '@/lib/utils';

const REP_OPTIONS = [1, 2, 3] as const;

export default function ProfilePage() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pro, setPro] = useState(false);
  const [dailyGoalReps, setDailyGoalReps] = useState<number>(1);
  const [moment, setMoment] = useState<MomentId | null>(null);
  const [reminderDone, setReminderDone] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setPro(isProCached());
    refreshEntitlement().then(setPro);
    setDailyGoalReps(loadDailyGoalReps());
    setMoment(loadMoment());
    setReminderDone(isReminderSet());
  }, []);

  function handleGoalChange(n: number) {
    saveDailyGoalReps(n);
    setDailyGoalReps(n);
  }

  function handleMomentChange(id: MomentId) {
    saveMoment(id);
    setMoment(id);
  }

  function handleReminderAdded() {
    markReminderSet();
    setReminderDone(true);
  }

  const level = levelFor(progress?.xp ?? 0);
  const goalModule = moment ? getModule(getMoment(moment)!.moduleId) : undefined;

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="mb-5 text-2xl font-bold">Profile</h1>

      {/* Identity card — avatar + title evolve with the user's level */}
      <div className="mb-6 flex items-center gap-4 rounded-3xl border border-hairline bg-surface-2 p-5">
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
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
            <span className="tabular-nums">{(progress?.xp ?? 0).toLocaleString()} XP</span>
            <span className="text-white/25">·</span>
            <FireIcon className="h-4 w-4 text-spotlight" />
            <span className="tabular-nums">{progress?.streak ?? 0} day streak</span>
          </p>
        </div>
      </div>

      {/* The moment they're training for — editable, because a goal you can
          revise is one you keep. Drives the up-next reason and the goal-module
          callout on the home screen. */}
      <div className="mb-6 rounded-2xl border border-hairline bg-surface-1 p-4">
        <p className="font-semibold text-white/80">What you&apos;re training for</p>
        <p className="mt-1 text-sm text-white/50">
          We aim your coaching and your next rep at this moment.
        </p>
        <div className="mt-3 space-y-2">
          {MOMENTS.map((m) => {
            const selected = moment === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleMomentChange(m.id)}
                aria-pressed={selected}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors active:scale-[0.99]',
                  selected
                    ? 'border-spotlight/50 bg-spotlight/10'
                    : 'border-hairline bg-surface-1 hover:bg-surface-2'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                    selected ? 'border-spotlight bg-spotlight' : 'border-white/25'
                  )}
                >
                  {selected && <CheckIcon className="h-3.5 w-3.5 stroke-[3] text-ink" />}
                </span>
                <span className="min-w-0 text-sm font-medium text-white/85">{m.label}</span>
              </button>
            );
          })}
        </div>
        {goalModule && (
          <p className="mt-2.5 text-xs text-white/40">
            Goal module: <span className="font-semibold text-spotlight/80">{goalModule.name}</span>
          </p>
        )}
      </div>

      {/* Daily goal selector */}
      <div className="mb-6 rounded-2xl border border-hairline bg-surface-1 p-4">
        <p className="mb-3 font-semibold text-white/80">Daily goal</p>
        <div className="flex gap-2">
          {REP_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => handleGoalChange(n)}
              aria-pressed={dailyGoalReps === n}
              className={cn(
                'flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]',
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

      {/* Daily reminder — zero-backend: put the rep in the user's own calendar */}
      <div className="mb-6 rounded-2xl border border-hairline bg-surface-1 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold text-white/80">
            <ClockIcon className="h-5 w-5 text-white/50" />
            Daily reminder
          </p>
          {reminderDone && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-stage/15 px-2.5 py-1 text-[11px] font-semibold text-stage">
              <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />
              Added
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-white/55">
          Put a 1-minute practice slot in your calendar — streaks live and die by a fixed time.
        </p>
        <div className="mt-3 flex gap-2">
          <Button asChild className="h-10 rounded-xl bg-spotlight text-ink hover:bg-spotlight/90">
            <a
              href={GOOGLE_CALENDAR_REMINDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleReminderAdded}
            >
              Add to Google Calendar
            </a>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              downloadPracticeReminderIcs();
              handleReminderAdded();
            }}
            className="h-10 rounded-xl text-white/60 hover:bg-white/10 hover:text-white/80"
          >
            .ics file
          </Button>
        </div>
      </div>

      {/* Privacy note */}
      <div className="mb-6 rounded-2xl border border-hairline bg-surface-1 p-4 text-sm text-white/60">
        <p className="flex items-center gap-2 font-semibold text-white/80">
          <ShieldCheckIcon className="h-5 w-5 text-stage" />
          Private by design
        </p>
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
      <div className="mb-6 rounded-2xl border border-hairline bg-surface-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 font-semibold text-white/80">
              {pro && <CheckIcon className="h-4 w-4 stroke-[3] text-stage" />}
              SmartSpeak Pro
            </p>
            <p className="mt-1 text-sm text-white/55">
              {pro
                ? 'All reps unlocked — thanks for your support!'
                : `Unlock all ${EXERCISES.length} work-scenario reps · ${PRO_PRICE}, one-time.`}
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
        <Button asChild variant="secondary" className="h-12 w-full justify-between rounded-2xl bg-white/10 text-white hover:bg-white/20">
          <Link href="/train">
            <span className="flex items-center gap-2">
              <MicrophoneIcon className="h-5 w-5 text-white/60" />
              Today&apos;s session
            </span>
            <ChevronRightIcon className="h-4 w-4 text-white/40" />
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-12 w-full justify-between rounded-2xl bg-white/10 text-white hover:bg-white/20">
          <Link href="/">
            <span className="flex items-center gap-2">
              <InformationCircleIcon className="h-5 w-5 text-white/60" />
              About SmartSpeak
            </span>
            <ChevronRightIcon className="h-4 w-4 text-white/40" />
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
            <p className="text-sm text-white/80">
              Reset your streak, XP, history, achievements and setup — back to a clean first-run? This can&apos;t be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => {
                  setProgress(resetProgress());
                  setConfirming(false);
                  router.push('/train');
                }}
                className="flex-1 bg-red-500 hover:bg-red-400"
              >
                Reset
              </Button>
              <Button
                onClick={() => setConfirming(false)}
                variant="secondary"
                className="flex-1 border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
