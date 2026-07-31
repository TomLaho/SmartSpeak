'use client';

import Link from 'next/link';
import { CheckIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { SetupState } from '@/lib/setup';
import { cn } from '@/lib/utils';

/**
 * The first-week checklist, rendered mid-run rather than from zero.
 *
 * The bar is already part-filled when the user first sees it because the step
 * it credits — choosing their speaking goal — is one they genuinely completed a
 * moment earlier. Momentum you already have is far easier to keep than momentum
 * you have to start, and this is the honest way to hand it to them.
 */
export function SetupChecklist({ state, onDismiss }: { state: SetupState; onDismiss: () => void }) {
  const remaining = state.steps.length - state.doneCount;

  return (
    <div className="mb-5 rounded-3xl border border-hairline bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">Get set up</p>
          <p className="mt-0.5 text-xs text-white/50">
            {state.doneCount} of {state.steps.length} done · {remaining} quick step
            {remaining === 1 ? '' : 's'} to go
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-spotlight">{state.pct}%</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-spotlight transition-all duration-500"
          style={{ width: `${state.pct}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1">
        {state.steps.map((step) =>
          step.done ? (
            <li key={step.id} className="flex items-center gap-2.5 px-1 py-2 text-sm text-white/40">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stage/20">
                <CheckIcon className="h-3.5 w-3.5 stroke-[3] text-stage" />
              </span>
              <span className="line-through">{step.label}</span>
            </li>
          ) : (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-center gap-2.5 rounded-xl px-1 py-2 text-sm text-white/80 transition-colors hover:bg-white/[0.04] active:bg-white/[0.07]"
              >
                <span className="h-5 w-5 shrink-0 rounded-full border border-white/25" />
                <span className="min-w-0 flex-1 truncate">{step.label}</span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/30" />
              </Link>
            </li>
          )
        )}
      </ul>

      <button
        onClick={onDismiss}
        className={cn(
          'mt-1 flex w-full items-center justify-center gap-1.5 py-1.5 text-xs text-white/30',
          'transition-colors hover:text-white/55'
        )}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
        Hide this
      </button>
    </div>
  );
}
