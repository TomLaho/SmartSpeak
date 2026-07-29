import { describe, expect, it } from 'vitest';
import { coachAttempt, paceWpm } from '@/lib/coach';
import { EXERCISES, getExercise, scorableDimensions, type Exercise } from '@/lib/exercises';
import { UNAVAILABLE_METRICS } from '@/lib/audio-dsp';
import { audioMetrics } from './helpers';

const scripted = EXERCISES.find((e) => e.type === 'read' && e.readingText) as Exercise;
const spoken = EXERCISES.find((e) => e.type !== 'read') as Exercise;

const SPEECH =
  'Last quarter we lost 12 hours a week to manual reconciliation. First we mapped every handoff, ' +
  'then we found the bottleneck sat in one spreadsheet. But the fix was small. I need one decision ' +
  'from you today: approve the pilot for two teams.';

describe('paceWpm', () => {
  it('prefers the transcript-independent syllable estimate', () => {
    expect(paceWpm(audioMetrics({ estimatedWpm: 150, wpm: 300, articulationWpm: 400 }))).toBe(150);
  });

  it('falls back through wpm to articulationWpm', () => {
    expect(paceWpm(audioMetrics({ estimatedWpm: undefined, wpm: 130 }))).toBe(130);
    expect(paceWpm(audioMetrics({ estimatedWpm: undefined, wpm: undefined }))).toBe(165);
  });
});

describe('pace scoring band', () => {
  const paceOf = (wpm: number) => {
    const r = coachAttempt(spoken, SPEECH, audioMetrics({ estimatedWpm: wpm }));
    return r.scores.find((s) => s.dimension === 'pace')!.score;
  };

  it('gives full marks anywhere inside the comfortable band', () => {
    // A plateau, not a single ideal: 150 wpm must not be penalised against 145.
    expect(paceOf(125)).toBe(100);
    expect(paceOf(145)).toBe(100);
    expect(paceOf(165)).toBe(100);
  });

  it('decays outside the band in both directions', () => {
    expect(paceOf(100)).toBeLessThan(100);
    expect(paceOf(200)).toBeLessThan(100);
    expect(paceOf(100)).toBeGreaterThan(paceOf(60));
  });
});

describe('scripted vs spoken reps', () => {
  it('scores a read-aloud on delivery plus accuracy only', () => {
    const result = coachAttempt(scripted, scripted.readingText as string, audioMetrics());
    const dims = result.scores.map((s) => s.dimension);
    expect(new Set(dims)).toEqual(new Set(scorableDimensions(scripted)));
    // Judging our own passage's word choice would grade us, not the presenter.
    expect(dims).not.toContain('concreteness');
    expect(dims).toContain('accuracy');
  });

  it('does not count lexical fillers in our own script', () => {
    // The passage is ours; only acoustic "uh/um" belong to the presenter.
    const withOurWords = coachAttempt(
      scripted,
      'so basically you know the thing is like actually really good',
      audioMetrics({ filledPauseCount: 0 })
    );
    expect(withOurWords.fillerCount).toBe(0);
  });

  it('does count lexical fillers on an unscripted rep', () => {
    const result = coachAttempt(
      spoken,
      'so basically you know the thing is like actually really good and I mean right',
      audioMetrics({ filledPauseCount: 2 })
    );
    expect(result.fillerCount).toBeGreaterThan(2);
  });
});

describe('read-aloud accuracy', () => {
  const accuracyOf = (said: string) => {
    const r = coachAttempt(scripted, said, audioMetrics());
    return r.scores.find((s) => s.dimension === 'accuracy')!;
  };

  it('scores a word-perfect read near the top', () => {
    expect(accuracyOf(scripted.readingText as string).score).toBeGreaterThanOrEqual(95);
  });

  it('scores a half-read passage well below a full one', () => {
    const full = accuracyOf(scripted.readingText as string).score;
    const words = (scripted.readingText as string).split(/\s+/);
    const half = accuracyOf(words.slice(0, Math.floor(words.length / 2)).join(' ')).score;
    expect(half).toBeLessThan(full);
  });

  it('reports unmeasured when there is nothing to compare', () => {
    expect(accuracyOf('um').measured).toBe(false);
  });
});

describe('overall score', () => {
  it('is the mean of the measured dimensions the user can see', () => {
    const result = coachAttempt(spoken, SPEECH, audioMetrics());
    const measured = result.scores.filter((s) => s.measured);
    const mean = Math.round(measured.reduce((a, s) => a + s.score, 0) / measured.length);
    expect(result.overallScore).toBe(mean);
  });

  it('stays within 0–100 for degenerate input', () => {
    for (const result of [
      coachAttempt(spoken, '', UNAVAILABLE_METRICS),
      coachAttempt(spoken, SPEECH.repeat(50), audioMetrics({ estimatedWpm: 900 })),
      coachAttempt(scripted, '', UNAVAILABLE_METRICS),
    ]) {
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('xp', () => {
  it('never falls below the show-up floor or above the base award', () => {
    const worst = coachAttempt(spoken, '', UNAVAILABLE_METRICS);
    const best = coachAttempt(spoken, SPEECH, audioMetrics());
    expect(worst.xpEarned).toBeGreaterThanOrEqual(Math.round(spoken.xp * 0.6));
    expect(best.xpEarned).toBeLessThanOrEqual(spoken.xp);
  });
});

describe('the "one thing" cue', () => {
  it('addresses the weakest measured dimension', () => {
    const result = coachAttempt(spoken, SPEECH, audioMetrics({ estimatedWpm: 260 }));
    const measured = result.scores.filter((s) => s.measured);
    const weakest = measured.reduce((a, b) => (b.score < a.score ? b : a));
    expect(result.primaryDimension).toBe(weakest.dimension);
    expect(result.primaryCue).toBeTruthy();
  });

  it('is present for every exercise in the curriculum', () => {
    for (const exercise of EXERCISES) {
      const result = coachAttempt(exercise, exercise.readingText ?? SPEECH, audioMetrics());
      expect(result.primaryCue, `no cue for ${exercise.id}`).toBeTruthy();
      expect(result.scores.length).toBeGreaterThan(0);
    }
  });
});

describe('personal-baseline deltas', () => {
  it('appends a delta only when the change is worth mentioning', () => {
    const detailFor = (previousPace: number) => {
      const r = coachAttempt(spoken, SPEECH, audioMetrics(), { pace: previousPace });
      return r.scores.find((s) => s.dimension === 'pace')!.detail;
    };
    const base = coachAttempt(spoken, SPEECH, audioMetrics()).scores.find(
      (s) => s.dimension === 'pace'
    )!.score;
    expect(detailFor(base - 20)).toContain('up 20 from last time');
    expect(detailFor(base - 1)).not.toContain('from last time');
  });
});

describe('curriculum integrity', () => {
  it('gives every exercise a focus dimension its own type can score', () => {
    for (const exercise of EXERCISES) {
      const scorable = scorableDimensions(exercise);
      const overlap = exercise.focus.filter((d) => scorable.includes(d));
      expect(overlap.length, `${exercise.id} trains dimensions it cannot score`).toBeGreaterThan(0);
    }
  });

  it('has unique exercise ids', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves every exercise id through getExercise', () => {
    for (const e of EXERCISES) expect(getExercise(e.id)?.id).toBe(e.id);
  });
});
