import { describe, expect, it } from 'vitest';
import { coachAttempt, headlineFor, paceWpm } from '@/lib/coach';
import { EXERCISES, getExercise, scorableDimensions, type Exercise } from '@/lib/exercises';
import { UNAVAILABLE_METRICS } from '@/lib/audio-dsp';
import { audioMetrics } from './helpers';

const scripted = EXERCISES.find((e) => e.type === 'read' && e.readingText) as Exercise;
const spoken = EXERCISES.find((e) => e.type !== 'read') as Exercise;

// 74 words — comfortably clears the 0.4 coverage threshold for every
// exercise this file uses it with (see the "coverage multiplier" tests
// below), so it reads as a complete take for facet/weighting/xp assertions
// that aren't themselves testing coverage.
const SPEECH =
  'Last quarter we lost 12 hours a week to manual reconciliation across three separate teams. ' +
  'First we mapped every handoff to see the process end to end, then we found the bottleneck ' +
  'sat in one shared spreadsheet nobody owned. But the fix was small and did not require new headcount. ' +
  'I need one decision from you today: approve the pilot for two teams to prove it out before scaling further.';

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

  it('does not cap a full-length take that clears the coverage bar', () => {
    const result = coachAttempt(spoken, SPEECH, fullLength());
    // SPEECH is a strong, well-formed, complete take — the floor/coverage
    // mechanisms must not touch it.
    expect(result.overallScore).toBeGreaterThan(65);
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

describe('intelligibility floor', () => {
  // These caps key off wordCount alone — audio timing is irrelevant, so use
  // fullLength() throughout to prove that.
  const fullLength = () => audioMetrics({ speakingSec: spoken.targetSeconds });

  it('scores 0 for an empty transcript', () => {
    const result = coachAttempt(spoken, '', fullLength());
    expect(result.wordCount).toBe(0);
    expect(result.overallScore).toBe(0);
  });

  it('caps 1–4 words at 10', () => {
    const result = coachAttempt(spoken, 'yes it works great', fullLength());
    expect(result.wordCount).toBe(4);
    expect(result.overallScore).toBeLessThanOrEqual(10);
  });

  it('caps 5–14 words at 30', () => {
    const result = coachAttempt(
      spoken,
      'great point really good stuff thanks everyone for listening today',
      fullLength()
    );
    expect(result.wordCount).toBeGreaterThanOrEqual(5);
    expect(result.wordCount).toBeLessThanOrEqual(14);
    expect(result.overallScore).toBeLessThanOrEqual(30);
  });

  it('does not floor-cap 15 words (the coverage multiplier may still apply)', () => {
    // 15 words sits just above the 5–14 floor band, so the hard 30 cap no
    // longer applies — but 15/145 is still far below the 0.40 coverage knee
    // (see the "coverage multiplier" tests below), so the score can still
    // legitimately land under 30 for a different reason.
    const fifteen = Array.from({ length: 15 }, (_, i) => `word${i}`).join(' ');
    const result = coachAttempt(spoken, fifteen, fullLength());
    expect(result.wordCount).toBe(15);
    expect(result.improvements.some((i) => /a fragment of what the prompt asks for/i.test(i))).toBe(false);
  });

  it('says why in plain language, about words rather than seconds', () => {
    const result = coachAttempt(spoken, 'yes it works', fullLength());
    expect(result.improvements.some((i) => /word/i.test(i))).toBe(true);
    expect(result.improvements.some((i) => /second/i.test(i))).toBe(false);
    expect(result.quickWin).toMatch(/word|talk|say/i);
  });
});

describe('coverage multiplier', () => {
  // d3-fillers (spoken) has targetSeconds = 60, so expectedWords =
  // round(60 * 145 / 60) = 145 exactly — the 0.40 knee sits at 58 words.
  const fullLength = () => audioMetrics({ speakingSec: spoken.targetSeconds });
  const wordsOf = (n: number) => Array.from({ length: n }, (_, i) => `content${i}`).join('. ') + '.';
  const hasCoverageNote = (i: string) => /complete response needs/.test(i);

  it('applies no penalty at exactly the 0.40 knee (58/145 words)', () => {
    const result = coachAttempt(spoken, wordsOf(58), fullLength());
    expect(result.improvements.some(hasCoverageNote)).toBe(false);
  });

  it('applies a penalty just below the knee (57/145 words)', () => {
    const result = coachAttempt(spoken, wordsOf(57), fullLength());
    expect(result.improvements.some(hasCoverageNote)).toBe(true);
  });

  it('scales down further the further below the knee coverage falls', () => {
    const nearKnee = coachAttempt(spoken, wordsOf(57), fullLength());
    const farBelowKnee = coachAttempt(spoken, wordsOf(29), fullLength()); // ~0.20 coverage
    expect(farBelowKnee.overallScore).toBeLessThan(nearKnee.overallScore);
  });

  it('for a scripted read, uses the script\'s own word count as the expectation', () => {
    const fullScript = scripted.readingText as string;
    const words = fullScript.split(/\s+/);
    const partial = words.slice(0, Math.floor(words.length * 0.3)).join(' '); // well under 0.4 coverage
    const result = coachAttempt(scripted, partial, audioMetrics());
    expect(result.improvements.some(hasCoverageNote)).toBe(true);
  });

  it('never applies to a scripted read when the full script is spoken', () => {
    const result = coachAttempt(scripted, scripted.readingText as string, audioMetrics());
    expect(result.improvements.some(hasCoverageNote)).toBe(false);
  });

  it('never applies when there is no target duration and no script (unmeasurable guard)', () => {
    const noTarget = { ...spoken, targetSeconds: 0 } as Exercise;
    const result = coachAttempt(noTarget, 'a fairly short reply right here', audioMetrics());
    expect(result.improvements.some(hasCoverageNote)).toBe(false);
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
