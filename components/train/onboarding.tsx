'use client';

import { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MOMENTS, DEFAULT_MOMENT, getMoment, saveMoment, type MomentId } from '@/lib/personalise';
import { saveDailyGoalReps } from '@/lib/local-store';
import { getModule } from '@/lib/exercises';
import { markOnboarded } from '@/lib/setup';
import { cn } from '@/lib/utils';

const REP_OPTIONS = [1, 2, 3] as const;
const DEFAULT_REPS = 1;

/**
 * First-run: two questions and a plan the user built.
 *
 * Both questions arrive with the most common answer already selected, so the
 * job is to confirm or adjust rather than to fill anything in — and the third
 * screen shows them the plan *they* assembled, named after the meeting they
 * actually care about. Two taps of investment is enough to make the path feel
 * theirs, which is the whole point: nothing is asked of them in return, and no
 * signup stands between this and their first rep.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [moment, setMoment] = useState<MomentId>(DEFAULT_MOMENT);
  const [reps, setReps] = useState<number>(DEFAULT_REPS);

  const chosen = getMoment(moment);
  const targetModule = chosen ? getModule(chosen.moduleId) : undefined;

  function finish() {
    saveMoment(moment);
    saveDailyGoalReps(reps);
    markOnboarded();
    onDone();
  }

  function skip() {
    // Skipping still commits the defaults — an unanswered question should leave
    // the user with a working plan, not an empty one.
    saveMoment(DEFAULT_MOMENT);
    saveDailyGoalReps(DEFAULT_REPS);
    markOnboarded();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-hairline bg-[#0f0e0c] p-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <button
          onClick={skip}
          aria-label="Skip setup"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-white/50 transition-colors hover:text-white/80 active:bg-white/20"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>

        {/* Step indicator — three dots, filled to the current step. */}
        <div className="mb-5 flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-spotlight' : 'bg-white/15'
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <>
            <h2 className="text-2xl font-bold leading-display tracking-display-tight">
              Which moment do you want to nail?
            </h2>
            <p className="mt-2 text-sm text-white/55">
              We&apos;ll aim your training at it. You can change this any time.
            </p>
            <div className="mt-5 space-y-2">
              {MOMENTS.map((m) => {
                const selected = moment === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMoment(m.id)}
                    aria-pressed={selected}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors active:scale-[0.99]',
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
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{m.label}</span>
                      <span className="mt-0.5 block text-xs text-white/50">{m.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-5 block w-full rounded-2xl bg-spotlight py-3.5 text-center text-sm font-bold text-ink transition-transform active:scale-[0.98]"
            >
              Continue
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold leading-display tracking-display-tight">
              How much practice a day?
            </h2>
            <p className="mt-2 text-sm text-white/55">
              A rep is about a minute. One a day is what builds the habit — the rest is upside.
            </p>
            <div className="mt-5 flex gap-2">
              {REP_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setReps(n)}
                  aria-pressed={reps === n}
                  className={cn(
                    'flex h-20 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors active:scale-[0.98]',
                    reps === n
                      ? 'border-spotlight/50 bg-spotlight/10 text-white'
                      : 'border-hairline bg-surface-1 text-white/60 hover:bg-surface-2'
                  )}
                >
                  <span className="text-2xl font-bold tracking-display">{n}</span>
                  <span className="text-[11px]">rep{n === 1 ? '' : 's'} / day</span>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-white/40">
              {reps === 1
                ? 'One rep a day builds the habit.'
                : reps === 2
                ? 'Two reps accelerates your improvement.'
                : 'Three reps a day is serious training.'}
            </p>
            <button
              onClick={() => setStep(2)}
              className="mt-5 block w-full rounded-2xl bg-spotlight py-3.5 text-center text-sm font-bold text-ink transition-transform active:scale-[0.98]"
            >
              Continue
            </button>
            <button
              onClick={() => setStep(0)}
              className="mt-2 block w-full py-2 text-center text-xs text-white/40 hover:text-white/60"
            >
              Back
            </button>
          </>
        )}

        {step === 2 && chosen && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-spotlight">Your plan</p>
            <h2 className="mt-1 text-2xl font-bold leading-display tracking-display-tight">
              {reps} rep{reps === 1 ? '' : 's'} a day, aimed at {chosen.label.toLowerCase()}
            </h2>
            <div className="mt-5 space-y-2.5">
              <PlanRow label="Your goal" value={chosen.blurb} />
              <PlanRow label="Daily target" value={`${reps} rep${reps === 1 ? '' : 's'} — about ${reps} minute${reps === 1 ? '' : 's'}`} />
              {targetModule && <PlanRow label="Goal module" value={targetModule.name} />}
            </div>
            <p className="mt-4 text-xs text-white/45">
              You start in <span className="font-semibold text-white/70">Command Presence</span> — the
              foundation every one of these moments is built on.
            </p>
            <button
              onClick={finish}
              className="mt-5 block w-full rounded-2xl bg-spotlight py-3.5 text-center text-sm font-bold text-ink transition-transform active:scale-[0.98]"
            >
              Start training
            </button>
            <button
              onClick={() => setStep(1)}
              className="mt-2 block w-full py-2 text-center text-xs text-white/40 hover:text-white/60"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface-1 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white/85">{value}</p>
    </div>
  );
}
