'use client';

/**
 * Personalisation — the small amount of setup the user *builds* themselves.
 *
 * First-run asks two questions: which work moment they're training for, and how
 * many reps a day they want. Both ship with a sensible default already selected,
 * so the task is "confirm and adjust", not "fill this out" — and both answers
 * are then reflected back everywhere (the home greeting, the up-next reason,
 * the module list). The point is ownership: a path the user chose is one they
 * come back to, where a generic path is one they abandon.
 *
 * Stored on-device like everything else. No account, no server.
 */

import type { ModuleId } from './exercises';

const MOMENT_KEY = 'smartspeak.moment.v1';

export type MomentId = 'update' | 'deck' | 'pitch' | 'tough-qa';

export interface Moment {
  id: MomentId;
  /** How the user describes it to themselves. */
  label: string;
  /** The concrete situation, in their words, for the confirmation screen. */
  blurb: string;
  /** The module that most directly rehearses this moment. */
  moduleId: ModuleId;
}

/**
 * Ordered by how often the moment actually comes up in a working week — the
 * first option doubles as the default, so the most common answer costs no taps.
 */
export const MOMENTS: Moment[] = [
  {
    id: 'update',
    label: 'Giving a status update',
    blurb: 'Reading out findings and progress without losing the room',
    moduleId: 'cut-through',
  },
  {
    id: 'deck',
    label: 'Walking a deck',
    blurb: 'Carrying a presentation as one connected story, slide to slide',
    moduleId: 'storyteller',
  },
  {
    id: 'pitch',
    label: 'Pitching for buy-in',
    blurb: 'Making the case for a plan and asking for the decision',
    moduleId: 'persuader',
  },
  {
    id: 'tough-qa',
    label: 'Handling tough questions',
    blurb: 'Staying composed and answer-first when your plan gets challenged',
    moduleId: 'grace-under-fire',
  },
];

/** The pre-selected answer. Never start the user on a blank choice. */
export const DEFAULT_MOMENT: MomentId = 'update';

export const getMoment = (id: MomentId | null): Moment | undefined =>
  MOMENTS.find((m) => m.id === id);

export function loadMoment(): MomentId | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MOMENT_KEY);
    return MOMENTS.some((m) => m.id === raw) ? (raw as MomentId) : null;
  } catch {
    return null;
  }
}

export function saveMoment(id: MomentId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MOMENT_KEY, id);
  } catch {
    /* storage full / unavailable — personalisation degrades to the default */
  }
}
