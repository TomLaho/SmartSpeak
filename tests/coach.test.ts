import { describe, expect, it } from 'vitest';
import { coachAttempt, headlineFor, paceWpm } from '@/lib/coach';
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

  it('gives full marks only in the narrowed core of the band', () => {
    // Band is 125–165 (width 40), mid = 145. Core is now the middle *quarter*
    // of the band's width, i.e. ±(40/8) = ±5 around the mid → [140, 150].
    expect(paceOf(145)).toBe(100);
    expect(paceOf(140)).toBe(100);
    expect(paceOf(150)).toBe(100);
    // A real recorded take of 154 wpm must land in the mid-90s, not 100 —
    // the case that motivated narrowing the core in the first place.
    expect(paceOf(154)).toBeGreaterThanOrEqual(90);
    expect(paceOf(154)).toBeLessThan(100);
  });

  it('scores mid-band (inside the band, outside the core) between the edge and full marks', () => {
    expect(paceOf(135)).toBeGreaterThan(80);
    expect(paceOf(135)).toBeLessThan(100);
    expect(paceOf(155)).toBeGreaterThan(80);
    expect(paceOf(155)).toBeLessThan(100);
  });

  it('scores the band edge at 80, not 88', () => {
    expect(paceOf(125)).toBe(80);
    expect(paceOf(165)).toBe(80);
  });

  it('decays outside the band in both directions, continuing from 80', () => {
    expect(paceOf(124)).toBeLessThan(80);
    expect(paceOf(166)).toBeLessThan(80);
    expect(paceOf(100)).toBeGreaterThan(paceOf(60));
  });
});

describe('filler scoring', () => {
  const fillersExercise = getExercise('d3-fillers') as Exercise;
  const scoreAt = (perMin: number) => {
    // speakingSec = 60 → speakingMin = 1, so filledPauseCount == perMin exactly.
    const r = coachAttempt(
      fillersExercise,
      SPEECH,
      audioMetrics({ speakingSec: 60, filledPauseCount: perMin })
    );
    return r.scores.find((s) => s.dimension === 'fillers')!.score;
  };

  it('applies the steeper 12-point-per-minute rate', () => {
    expect(scoreAt(2)).toBe(76);
    expect(scoreAt(4)).toBe(52);
    expect(scoreAt(6)).toBe(28);
  });

  it('no longer lets 5 hesitations a minute pass as a decent score', () => {
    // Under the old coefficient (6) this scored 70 — clearly too forgiving.
    expect(scoreAt(5)).toBeLessThan(50);
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
  // Full-length speaking time so the duration cap (tested separately below)
  // never confounds these dimension/facet-weighting assertions.
  const fullLength = (overrides: Parameters<typeof audioMetrics>[0] = {}) =>
    audioMetrics({ speakingSec: spoken.targetSeconds, ...overrides });

  it('is the focus-weighted mean of the measured facets', () => {
    const result = coachAttempt(spoken, SPEECH, fullLength());
    const measured = result.facets.filter((f) => f.measured);
    const base = measured.length ? measured : result.facets;
    const weightOf = (f: (typeof base)[number]) => (f.focus ? 2 : 1);
    const totalWeight = base.reduce((a, f) => a + weightOf(f), 0);
    const weightedMean = Math.round(base.reduce((a, f) => a + f.score * weightOf(f), 0) / totalWeight);
    expect(result.overallScore).toBe(weightedMean);
  });

  it('weighting facets 2x for focus actually moves the overall vs. a plain mean', () => {
    // spoken (d3-fillers).focus is fillers/pauses/pace, so the Pace and
    // Fluency facets are focus and Voice/Opening/Structure/Substance are
    // "extras". Tank energy (part of the non-focus Voice facet) and confirm
    // the weighted overall differs from — and lands above — the plain,
    // unweighted mean of the facets, since the dragged-down extra now counts
    // for less than it would in a straight average.
    const result = coachAttempt(spoken, SPEECH, fullLength({ energy: { meanDb: -22, dynamicRangeDb: 1 } }));
    const plainMean = result.facets.reduce((a, f) => a + f.score, 0) / result.facets.length;
    const voiceFacet = result.facets.find((f) => f.facet === 'voice')!;
    expect(voiceFacet.focus).toBe(false);
    expect(voiceFacet.score).toBeLessThan(plainMean);
    expect(result.overallScore).toBeGreaterThan(Math.round(plainMean));
  });

  it('caps a near-empty take regardless of how its measured dimensions score', () => {
    const result = coachAttempt(spoken, 'great point really good stuff', fullLength());
    expect(result.wordCount).toBeLessThan(25);
    expect(result.overallScore).toBeLessThanOrEqual(55);
  });

  it('says why the score is capped when the take is too short', () => {
    const result = coachAttempt(spoken, 'great point really good stuff', fullLength());
    expect(result.improvements.some((i) => /too little to score/i.test(i))).toBe(true);
    expect(result.quickWin).toMatch(/keep talking/i);
  });

  it('does not cap a full-length take even at 25+ words', () => {
    const result = coachAttempt(spoken, SPEECH, fullLength());
    expect(result.wordCount).toBeGreaterThanOrEqual(25);
    // SPEECH is a strong, well-formed take — the cap must not touch it.
    expect(result.overallScore).toBeGreaterThan(55);
  });

  it('stays within 0–100 for degenerate input', () => {
    for (const result of [
      coachAttempt(spoken, '', UNAVAILABLE_METRICS),
      coachAttempt(spoken, SPEECH.repeat(50), fullLength({ estimatedWpm: 900 })),
      coachAttempt(scripted, '', UNAVAILABLE_METRICS),
    ]) {
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('facets', () => {
  it("omits a facet with no scorable parts for this exercise's type", () => {
    // d1-pace is a `read` rep: only delivery dims + accuracy are scorable, so
    // Opening / Structure / Substance (all content dimensions) don't apply.
    const result = coachAttempt(scripted, scripted.readingText as string, audioMetrics());
    const present = result.facets.map((f) => f.facet);
    expect(present).toContain('pace');
    expect(present).toContain('voice');
    expect(present).toContain('fluency');
    expect(present).not.toContain('opening');
    expect(present).not.toContain('structure');
    expect(present).not.toContain('substance');
  });

  it('still includes a facet with only one of its two parts scorable (e.g. Fluency without accuracy)', () => {
    // spoken (topic) reps can't score accuracy — Fluency should still show up
    // with just `fillers`.
    const result = coachAttempt(spoken, SPEECH, audioMetrics());
    const fluency = result.facets.find((f) => f.facet === 'fluency');
    expect(fluency).toBeTruthy();
    expect(fluency!.parts.map((p) => p.dimension)).toEqual(['fillers']);
  });

  it('scores a facet as the mean of its measured parts, falling back to unmeasured ones only when nothing was measured', () => {
    // Scripted transcript has plenty of words (fillers is scored on
    // speakingMin, not word count) but speakingSec = 0 leaves fillers
    // unmeasured while accuracy — read straight from the transcript — is
    // measured. Fluency's score must equal accuracy's alone.
    const result = coachAttempt(
      scripted,
      scripted.readingText as string,
      audioMetrics({ speakingSec: 0 })
    );
    const fluency = result.facets.find((f) => f.facet === 'fluency')!;
    const accuracy = fluency.parts.find((p) => p.dimension === 'accuracy')!;
    const fillers = fluency.parts.find((p) => p.dimension === 'fillers')!;
    expect(fillers.measured).toBe(false);
    expect(accuracy.measured).toBe(true);
    expect(fluency.measured).toBe(true);
    expect(fluency.score).toBe(accuracy.score);
  });

  it('propagates focus when any one of its parts is a focus dimension', () => {
    // d1-pace focus = ['pace', 'pauses'] → the Pace facet is focus (both
    // parts), Voice and Fluency are not (neither of their parts is focus).
    const result = coachAttempt(scripted, scripted.readingText as string, audioMetrics());
    expect(result.facets.find((f) => f.facet === 'pace')!.focus).toBe(true);
    expect(result.facets.find((f) => f.facet === 'voice')!.focus).toBe(false);
    expect(result.facets.find((f) => f.facet === 'fluency')!.focus).toBe(false);
  });

  it('orders focus facets first, same as the dimension ordering', () => {
    const result = coachAttempt(scripted, scripted.readingText as string, audioMetrics());
    const firstNonFocusIndex = result.facets.findIndex((f) => !f.focus);
    const lastFocusIndex = result.facets.map((f) => f.focus).lastIndexOf(true);
    if (firstNonFocusIndex !== -1 && lastFocusIndex !== -1) {
      expect(lastFocusIndex).toBeLessThan(firstNonFocusIndex);
    }
  });

  it('picks the weakest measured part\'s detail when amber/red, the strongest when green', () => {
    const result = coachAttempt(scripted, scripted.readingText as string, audioMetrics());
    for (const facet of result.facets) {
      const basis = facet.parts.filter((p) => p.measured).length ? facet.parts.filter((p) => p.measured) : facet.parts;
      const expected =
        facet.tier === 'green'
          ? basis.reduce((a, p) => (p.score > a.score ? p : a)).detail
          : basis.reduce((a, p) => (p.score < a.score ? p : a)).detail;
      expect(facet.detail).toBe(expected);
    }
  });
});

describe('duration cap', () => {
  // scripted (d1-pace) has targetSeconds = 60. Use its full passage as the
  // transcript so the 25-word short-take cap never confounds these.
  const text = scripted.readingText as string;
  const withSpeakingSec = (speakingSec: number) =>
    coachAttempt(scripted, text, audioMetrics({ speakingSec }));
  const uncapped = withSpeakingSec(60).overallScore; // 100% of target — no cap

  it('applies no cap at or above 70% of target', () => {
    // 0.7 * 60 = 42s exactly — the boundary itself must NOT be capped.
    expect(withSpeakingSec(42).overallScore).toBe(uncapped);
    expect(withSpeakingSec(50).overallScore).toBe(uncapped);
  });

  it('caps at 72 for 40%–70% of target, including the lower boundary', () => {
    // 0.4 * 60 = 24s exactly falls in this band (not the harsher one below).
    expect(withSpeakingSec(24).overallScore).toBeLessThanOrEqual(72);
    expect(withSpeakingSec(41).overallScore).toBeLessThanOrEqual(72);
    if (uncapped > 72) {
      expect(withSpeakingSec(24).overallScore).toBe(72);
      expect(withSpeakingSec(41).overallScore).toBe(72);
    }
  });

  it('caps at 55 under 40% of target', () => {
    expect(withSpeakingSec(23).overallScore).toBeLessThanOrEqual(55);
    expect(withSpeakingSec(5).overallScore).toBeLessThanOrEqual(55);
    if (uncapped > 55) {
      expect(withSpeakingSec(23).overallScore).toBe(55);
    }
  });

  it('takes the lowest applicable cap when both the word cap and duration cap apply', () => {
    // 3 words (short-take cap, 55) and 5s of a 60s target (duration cap, 55) —
    // both land on the same floor here, but the overall must never exceed it.
    const result = coachAttempt(scripted, 'yes it works', audioMetrics({ speakingSec: 5 }));
    expect(result.overallScore).toBeLessThanOrEqual(55);
  });

  it('says why in plain language, with the actual numbers', () => {
    const result = withSpeakingSec(10);
    expect(result.improvements.some((i) => /10s of a 60s target/.test(i))).toBe(true);
    expect(result.quickWin).toMatch(/full length/i);
  });

  it('never applies when speaking time is unmeasurable (no audio)', () => {
    // Guard: an unmeasurable thing must never be the reason someone is marked down.
    const withoutAudio = coachAttempt(scripted, text, audioMetrics({ speakingSec: 0 }));
    const withoutTarget = coachAttempt(
      { ...scripted, targetSeconds: 0 } as Exercise,
      text,
      audioMetrics({ speakingSec: 0 })
    );
    expect(withoutAudio.overallScore).toBe(withoutTarget.overallScore);
    expect(withoutAudio.improvements.some((i) => /target/.test(i))).toBe(false);
  });

  it('never applies when the exercise has no target duration', () => {
    const noTarget = { ...scripted, targetSeconds: 0 } as Exercise;
    const result = coachAttempt(noTarget, text, audioMetrics({ speakingSec: 5 }));
    expect(result.improvements.some((i) => /target/.test(i))).toBe(false);
  });
});

describe('headlineFor', () => {
  it('maps overall score to the right headline at every boundary', () => {
    expect(headlineFor(100)).toBe('Outstanding!');
    expect(headlineFor(92)).toBe('Outstanding!');
    expect(headlineFor(91)).toBe('Great take!');
    expect(headlineFor(80)).toBe('Great take!');
    expect(headlineFor(79)).toBe('Solid effort');
    expect(headlineFor(62)).toBe('Solid effort');
    expect(headlineFor(61)).toBe('Good start — keep going');
    expect(headlineFor(0)).toBe('Good start — keep going');
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
