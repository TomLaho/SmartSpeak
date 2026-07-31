'use client';

/**
 * First-week setup checklist.
 *
 * Deliberately *not* a 0% progress bar. People move faster toward a finish line
 * they've already started running toward, and abandon one they haven't — so the
 * work the user has genuinely already done (choosing their speaking goal during
 * first-run) is counted as the first completed step. They arrive on the home
 * screen a quarter of the way through a four-step list rather than at zero.
 *
 * Every step is a real, verifiable action; nothing here is pre-ticked that the
 * user didn't actually do.
 */

const ONBOARDED_KEY = 'smartspeak.onboarded.v1';
const REMINDER_KEY = 'smartspeak.reminderSet.v1';
const DISMISSED_KEY = 'smartspeak.setupDismissed.v1';

export interface SetupStep {
  id: 'goal' | 'first-rep' | 'calibrate' | 'reminder';
  label: string;
  /** Where tapping the step takes them. */
  href: string;
  done: boolean;
}

export interface SetupState {
  steps: SetupStep[];
  doneCount: number;
  /** 0–100, and never 0 once first-run is complete. */
  pct: number;
  complete: boolean;
}

export interface SetupInput {
  /** True once the user has picked their speaking goal in first-run. */
  goalChosen: boolean;
  /** Total takes recorded, ever. */
  totalReps: number;
  calibrated: boolean;
  reminderSet: boolean;
  /** Where the "record a rep" step should send them. */
  firstRepHref: string;
}

export function setupState(input: SetupInput): SetupState {
  const steps: SetupStep[] = [
    { id: 'goal', label: 'Pick the moment you want to nail', href: '/train/profile', done: input.goalChosen },
    { id: 'first-rep', label: 'Record your first 1-minute rep', href: input.firstRepHref, done: input.totalReps > 0 },
    { id: 'calibrate', label: 'Calibrate your mic (2 seconds)', href: '/train/profile', done: input.calibrated },
    { id: 'reminder', label: 'Put a daily slot in your calendar', href: '/train/profile', done: input.reminderSet },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return {
    steps,
    doneCount,
    pct: Math.round((doneCount / steps.length) * 100),
    complete: doneCount === steps.length,
  };
}

// ───────────────────────────── flags ─────────────────────────────

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    /* storage full / unavailable */
  }
}

export const isOnboarded = (): boolean => readFlag(ONBOARDED_KEY);
export const markOnboarded = (): void => writeFlag(ONBOARDED_KEY);

/**
 * Set when the user actually triggers a calendar add. We can't see into their
 * calendar from a zero-backend app, so this records the action they took, not a
 * confirmed event — which is the honest claim to make on the checklist.
 */
export const isReminderSet = (): boolean => readFlag(REMINDER_KEY);
export const markReminderSet = (): void => writeFlag(REMINDER_KEY);

export const isSetupDismissed = (): boolean => readFlag(DISMISSED_KEY);
export const dismissSetup = (): void => writeFlag(DISMISSED_KEY);
