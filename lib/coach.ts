'use client';

import type { AudioMetrics } from './audio-analysis';
import {
  DIMENSION_LABELS,
  scorableDimensions,
  spokenText,
  type Dimension,
  type Exercise,
} from './exercises';

/**
 * Deterministic, on-device coaching.
 *
 * Turns audio metrics + the transcript into per-dimension scores and concrete,
 * human feedback — with zero backend. Delivery dimensions come from the real
 * audio analysis; structure & content dimensions come from transcript
 * heuristics.
 *
 * (In the cloud build this is where an LLM pass would be layered on top; the
 * heuristic scores make a great, cheap prompt scaffold.)
 */

export interface DimensionScore {
  dimension: Dimension;
  label: string;
  score: number; // 0-100
  detail: string;
  measured: boolean; // false when we lacked data (e.g. no transcript)
  /** Performance tier derived from score: >=75 green, 55–74 amber, <55 red. */
  tier?: 'green' | 'amber' | 'red';
}

export interface CoachResult {
  overallScore: number;
  scores: DimensionScore[];
  strengths: string[];
  improvements: string[];
  quickWin: string;
  wordCount: number;
  /** Combined acoustic hesitations + lexical fillers. */
  fillerCount: number;
  xpEarned: number;
  /**
   * The single most important next-rep instruction (deliberate-practice
   * "one thing" rule) — same text as quickWin but surfaced explicitly.
   */
  primaryCue?: string;
  /** Which dimension the primaryCue addresses. */
  primaryDimension?: Dimension;
}

// Non-vocalised fillers we can only catch in the transcript. The vocalised
// ones ("um/uh/er/ah") are detected acoustically in lib/audio-analysis.ts, so
// they're intentionally excluded here to avoid double-counting.
const LEXICAL_FILLERS = ['like', 'you know', 'so', 'actually', 'basically', 'literally', 'kind of', 'sort of', 'i mean', 'right', 'i guess'];
const VAGUE = ['thing', 'things', 'stuff', 'nice', 'good', 'bad', 'very', 'really', 'a lot', 'kind of', 'sort of', 'somehow', 'whatever', 'etc'];
const SENSORY = ['saw', 'heard', 'felt', 'smell', 'loud', 'quiet', 'bright', 'dark', 'cold', 'warm', 'red', 'blue', 'rough', 'smooth', 'tiny', 'huge'];
const SIGNPOSTS = ['first', 'second', 'third', 'next', 'then', 'finally', 'after', 'before', 'meanwhile', 'in conclusion', 'to summarize', 'in the end'];
const TURNING = ['but', 'suddenly', 'until', 'however', 'because', 'so that', 'realized', 'turned out', 'that is when', "that's when"];
const WEAK_OPENERS = ['so ', 'um ', 'uh ', 'well ', 'ok ', 'okay ', 'basically ', 'today i', 'i want to talk', 'i am going to', "i'm going to", 'this is about'];

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);
}

function sentences(text: string): string[] {
  return text
    .replace(/([.!?])+/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function countOccurrences(haystack: string, needles: string[]): number {
  let n = 0;
  for (const needle of needles) {
    const re = new RegExp(`(^|[^a-z])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'g');
    n += (haystack.match(re) || []).length;
  }
  return n;
}

/** Triangular score: 100 at `ideal`, falling to ~0 at `ideal ± span`. */
function bell(value: number, ideal: number, span: number): number {
  const score = 100 - (Math.abs(value - ideal) / span) * 100;
  return clamp(score);
}

/**
 * Plateau score: two-tier inside [lo, hi], decaying from 88 toward 0 outside it.
 *
 * Most delivery metrics have a *range* that reads as good, not a single ideal
 * value, so a triangular curve around one point would quietly punish perfectly
 * good speech for missing an arbitrary target — 150 wpm is not worse than 145
 * wpm. But the whole band being full marks made merely-acceptable delivery
 * indistinguishable from genuinely good delivery, which was the single
 * biggest source of score inflation. So only the centre quarter-to-quarter of
 * the band scores 100; the rest of the band scales 88→100 toward the centre.
 * Outside the band, decay continues from that same 88 down toward 0 across
 * `span`, so the edge of "acceptable" and the start of "outside acceptable"
 * don't jump.
 */
function plateau(value: number, lo: number, hi: number, span: number): number {
  const mid = (lo + hi) / 2;
  const quarter = (hi - lo) / 4;
  if (value >= mid - quarter && value <= mid + quarter) return 100;
  if (value >= lo && value <= hi) {
    const distanceFromCore = value < mid ? mid - quarter - value : value - (mid + quarter);
    return clamp(100 - (distanceFromCore / quarter) * 12);
  }
  const distance = value < lo ? lo - value : value - hi;
  return clamp(88 - (distance / span) * 88);
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

// ─────────────────────────── Delivery scorers ───────────────────────────

/**
 * The words-per-minute figure the coach scores on, and the one the UI must
 * display.
 *
 * Prefers the transcript-independent syllable-rate estimate: it's bounded by
 * the audio and immune to speech-to-text over-counting, which can report absurd
 * word rates on short clips. `articulationWpm` divides words by *speaking* time
 * only — a real phonetics measure, but it runs far higher than speech rate, so
 * showing it under a "Pace / wpm" label made the tile disagree with the score
 * beside it (a normal read displayed as 338 wpm).
 */
export function paceWpm(audio: AudioMetrics): number | undefined {
  return audio.estimatedWpm ?? audio.wpm ?? audio.articulationWpm;
}

function scorePace(audio: AudioMetrics): DimensionScore {
  const wpm = paceWpm(audio);
  if (!wpm) {
    return dim('pace', 70, 'Speak a little longer so we can measure your pace from the audio.', false);
  }
  // 125–165 wpm is the whole comfortable presenting band, not a single target.
  const score = plateau(wpm, 125, 165, 45);
  let detail: string;
  if (wpm < 125) detail = `~${wpm} wpm — a touch slow. A little more momentum keeps the energy up.`;
  else if (wpm > 165) detail = `~${wpm} wpm — quite fast. Slow down ~10% so each point can land.`;
  else detail = `~${wpm} wpm — right in the confident, easy-to-follow zone.`;
  return dim('pace', score, detail, true);
}

function scorePauses(audio: AudioMetrics): DimensionScore {
  if (audio.unavailable) return dim('pauses', 70, 'Pause analysis needs the audio recording.', false);
  const ppm = audio.pausesPerMin;
  // A "pause" here is any silence over 0.35s — i.e. ordinary clause-level
  // phrasing, not just dramatic ones. Well-phrased speech runs 8–22 of them a
  // minute, so that whole band is full marks; the old single 10/min ideal
  // scored normal, well-paced delivery as a failure.
  const score = plateau(ppm, 8, 22, 14);
  let detail: string;
  if (ppm < 8) detail = `Only ${audio.pauseCount} clear pause(s). Build in silence before key points.`;
  else if (ppm > 22) detail = `Lots of pausing (${ppm}/min). Some hesitation — try shorter, more deliberate breaks.`;
  else detail = `${audio.pauseCount} well-placed pauses. Nice use of silence to shape your delivery.`;
  if (audio.longPauseCount >= 3) detail += ` (${audio.longPauseCount} long gaps — keep them intentional.)`;
  return dim('pauses', score, detail, true);
}

function scoreIntonation(audio: AudioMetrics): DimensionScore {
  if (audio.unavailable || audio.pitch.voicedRatio < 0.15) {
    return dim('intonation', 65, "Couldn't track pitch clearly — record somewhere quiet for this one.", false);
  }
  const v = audio.pitch.variationSemitones;
  // Monotone ≈ <2 st; natural expressive presenting ≈ 2.5–7 st; >9 is theatrical.
  const score = plateau(v, 2.5, 7, 3);
  let detail: string;
  if (v < 2.5) detail = `Fairly monotone (${v} semitones of pitch movement). Let your voice rise and fall more.`;
  else if (v > 7) detail = `Very animated pitch (${v} semitones). Great energy — just keep it controlled.`;
  else detail = `Lively intonation (${v} semitones of variation). Your voice carries the meaning well.`;
  return dim('intonation', score, detail, true);
}

function scoreEnergy(audio: AudioMetrics): DimensionScore {
  if (audio.unavailable) return dim('energy', 70, 'Volume dynamics need the audio recording.', false);
  const range = audio.energy.dynamicRangeDb;
  // 8–20 dB of movement is the expressive-but-controlled band.
  const score = plateau(range, 8, 20, 10);
  let detail =
    range < 8
      ? `Flat volume (${range} dB range). Push key words louder and pull back elsewhere.`
      : `Good vocal dynamics (${range} dB range) — you vary loudness to keep attention.`;
  // Relative to the user's calibrated speaking level, when available.
  const vb = audio.energy.vsBaselineDb;
  if (typeof vb === 'number') {
    if (vb <= -4) detail += ` You were ~${Math.abs(vb)} dB under your usual level — project a little more.`;
    else if (vb >= 4) detail += ` A touch above your usual level — strong presence.`;
  }
  return dim('energy', score, detail, true);
}

function scoreFillers(
  text: string,
  words: number,
  audio: AudioMetrics,
  scripted: boolean
): DimensionScore {
  // Acoustic "uh/um" hesitations come straight from the audio; lexical fillers
  // ("like", "you know", …) come from the transcript when we have one.
  //
  // On a scripted rep the transcript is *our* passage, so counting lexical
  // fillers would dock the presenter for words we wrote. Only the acoustic
  // hesitations are genuinely theirs.
  const lexical =
    !scripted && words >= 5 ? countOccurrences(' ' + text.toLowerCase() + ' ', LEXICAL_FILLERS) : 0;
  const acoustic = audio.unavailable ? 0 : audio.filledPauseCount;
  const total = lexical + acoustic;

  const speakingMin = audio.speakingSec > 0 ? audio.speakingSec / 60 : 0;
  if (!speakingMin && words < 5) {
    return dim('fillers', 70, 'Speak a little more to measure filler words.', false);
  }
  // Without real speaking-time data we can't compute a meaningful per-minute rate.
  if (!speakingMin) {
    return dim('fillers', 70, 'No audio timing — record a take to measure filler rate.', false);
  }
  const perMin = total / speakingMin;
  // 12 points per hesitation/min: 2/min → 76, 4/min → 52, 6/min → 28. The old
  // coefficient (6) let 5 hesitations a minute still score 70 — far too
  // forgiving for something the listener notices every 12 seconds.
  const score = clamp(100 - perMin * 12);

  let detail: string;
  if (total === 0) {
    detail = 'No fillers or hesitations detected — crisp and clean.';
  } else {
    const parts: string[] = [];
    if (acoustic) parts.push(`${acoustic} "uh/um" hesitation${acoustic === 1 ? '' : 's'}`);
    if (lexical) parts.push(`${lexical} filler word${lexical === 1 ? '' : 's'}`);
    detail = `${parts.join(' and ')} (~${perMin.toFixed(1)}/min). Replace each one with a silent breath.`;
  }
  return dim('fillers', score, detail, true);
}

/**
 * How faithfully the passage was read.
 *
 * This is the one content dimension a scripted rep can honestly measure, and it
 * replaces the four that only graded our own copy. Uses a bag-of-words overlap
 * rather than strict sequence alignment: speech-to-text drops and mangles words
 * often enough that punishing word order would mostly measure the recogniser,
 * not the reader.
 *
 * Coverage (how much of the script was actually spoken) is weighted more
 * heavily than extra words, because skipping lines is the failure that matters
 * — a few inserted words are usually just transcription noise.
 */
function scoreAccuracy(text: string, readingText: string): DimensionScore {
  const spoken = tokenize(text);
  // Compare against the words to be *said* — "[pause]" cues are not spoken.
  const script = tokenize(spokenText(readingText));
  if (script.length === 0) {
    return dim('accuracy', 70, 'No passage to compare against.', false);
  }
  if (spoken.length < 3) {
    return dim('accuracy', 70, "We couldn't make out enough words to check against the passage.", false);
  }

  // Multiset overlap: each script word can only be matched once.
  const remaining = new Map<string, number>();
  for (const w of script) remaining.set(w, (remaining.get(w) ?? 0) + 1);
  let matched = 0;
  for (const w of spoken) {
    const left = remaining.get(w) ?? 0;
    if (left > 0) {
      remaining.set(w, left - 1);
      matched++;
    }
  }

  const coverage = matched / script.length; // how much of the script was said
  const precision = matched / spoken.length; // how much of what was said was script
  const score = clamp(coverage * 80 + precision * 20);

  const pct = Math.round(coverage * 100);
  let detail: string;
  if (coverage >= 0.9) {
    detail = `Read the passage almost word-perfect (${pct}% matched). Now focus purely on how it sounds.`;
  } else if (coverage >= 0.7) {
    detail = `Got ${pct}% of the passage. A few words drifted — worth a second look before your next take.`;
  } else if (coverage >= 0.4) {
    detail = `About ${pct}% of the passage matched. You may have skipped a line, or the mic missed some words.`;
  } else {
    detail = `Only ${pct}% of the passage matched. Try again somewhere quieter, reading the whole thing through.`;
  }
  return dim('accuracy', score, detail, true);
}

// ────────────────────── Structure & content scorers ─────────────────────

function scoreHook(text: string): DimensionScore {
  const sents = sentences(text);
  if (sents.length === 0) return dim('hook', 50, 'No transcript to evaluate your opening.', false);
  const opener = sents[0].toLowerCase();
  let score = 55;
  const reasons: string[] = [];

  if (WEAK_OPENERS.some((w) => opener.startsWith(w.trim()) || opener.startsWith(w))) {
    score -= 20;
    reasons.push('it starts with throat-clearing');
  }
  if (/\?$/.test(sents[0].trim())) {
    score += 18;
    reasons.push('opens with a question');
  }
  if (/\d/.test(opener)) {
    score += 12;
    reasons.push('uses a concrete number');
  }
  if (/\b(you|your|imagine|picture)\b/.test(opener)) {
    score += 12;
    reasons.push('speaks directly to the listener');
  }
  const openerWords = tokenize(sents[0]).length;
  if (openerWords <= 14 && openerWords >= 3) score += 8; // punchy
  if (openerWords > 35) {
    score -= 12;
    reasons.push('the first sentence runs long');
  }

  const detail = reasons.length
    ? `Your opening ${reasons.join(', ')}.`
    : 'A solid opening — sharpen it with a question, a number, or a vivid image.';
  return dim('hook', clamp(score), detail, true);
}

function scoreStructure(text: string, exercise: Exercise): DimensionScore {
  const sents = sentences(text);
  const lower = ' ' + text.toLowerCase() + ' ';
  if (sents.length < 2) return dim('structure', 50, 'Too short to show a clear structure.', sents.length > 0);
  const signposts = countOccurrences(lower, SIGNPOSTS);
  const turning = countOccurrences(lower, TURNING);
  let score = 50 + Math.min(30, signposts * 10) + Math.min(20, turning * 7);
  // Story exercises specifically want a turning point.
  if (exercise.type === 'story' && turning === 0) {
    score -= 15;
  }
  const detail =
    signposts + turning === 0
      ? 'Hard to follow the thread — add signposts ("first", "then", "but", "finally").'
      : `Clear progression (${signposts} signpost(s), ${turning} turning point(s)). The thread is easy to follow.`;
  return dim('structure', clamp(score), detail, true);
}

function scoreClarity(text: string): DimensionScore {
  const words = tokenize(text);
  const sents = sentences(text);
  if (words.length < 5 || sents.length === 0) return dim('clarity', 70, 'Speak a little more to measure clarity.', false);
  const avgLen = words.length / sents.length;
  const longWords = words.filter((w) => w.length > 9).length;
  const complexRatio = longWords / words.length;
  // Reward ~10-18 word sentences and few long words.
  const lengthScore = bell(avgLen, 14, 12);
  const simpleScore = clamp(100 - complexRatio * 220);
  const score = clamp(lengthScore * 0.55 + simpleScore * 0.45);
  let detail: string;
  if (avgLen > 24) detail = `Long sentences (~${avgLen.toFixed(0)} words). Break them up so each idea is easy to hold.`;
  else if (complexRatio > 0.18) detail = 'Some heavy vocabulary — swap a few long words for everyday ones.';
  else detail = `Clear and easy to follow (~${avgLen.toFixed(0)} words/sentence, plain language).`;
  return dim('clarity', score, detail, true);
}

function scoreConcreteness(text: string): DimensionScore {
  const words = tokenize(text);
  if (words.length < 5) return dim('concreteness', 70, 'Speak a little more to measure specificity.', false);
  const lower = ' ' + text.toLowerCase() + ' ';
  const vague = countOccurrences(lower, VAGUE);
  const numbers = (text.match(/\d+/g) || []).length;
  const sensory = countOccurrences(lower, SENSORY);
  const vaguePer100 = (vague / words.length) * 100;
  const specificPer100 = ((numbers + sensory) / words.length) * 100;
  const score = clamp(60 - vaguePer100 * 6 + specificPer100 * 10);
  const detail =
    vaguePer100 > 4
      ? `Several vague words (${vague}). Trade "thing/stuff/nice" for specific numbers, names, and examples.`
      : numbers + sensory > 0
      ? `Nicely concrete — ${numbers} number(s) and ${sensory} specific detail(s) make it credible.`
      : 'Add a specific detail — a number, a name, an example — to make it land.';
  return dim('concreteness', score, detail, true);
}

function dim(dimension: Dimension, score: number, detail: string, measured: boolean): DimensionScore {
  const s = clamp(score);
  const tier: 'green' | 'amber' | 'red' = s >= 75 ? 'green' : s >= 55 ? 'amber' : 'red';
  return { dimension, label: DIMENSION_LABELS[dimension], score: s, detail, measured, tier };
}

// ─────────────────────────────── Compose ───────────────────────────────

export function coachAttempt(
  exercise: Exercise,
  transcript: string,
  audio: AudioMetrics,
  previous?: Partial<Record<Dimension, number>>
): CoachResult {
  const text = transcript.trim();
  const words = tokenize(text);
  const wordCount = words.length;

  // A scripted rep reads our passage, so transcript-derived judgements about
  // word choice belong to us, not the presenter. See `scorableDimensions`.
  const scripted = exercise.type === 'read' && !!exercise.readingText;

  const lexicalFillers =
    !scripted && wordCount >= 5 ? countOccurrences(' ' + text.toLowerCase() + ' ', LEXICAL_FILLERS) : 0;
  const fillerCount = lexicalFillers + (audio.unavailable ? 0 : audio.filledPauseCount);

  const all: Record<Dimension, () => DimensionScore> = {
    pace: () => scorePace(audio),
    pauses: () => scorePauses(audio),
    intonation: () => scoreIntonation(audio),
    energy: () => scoreEnergy(audio),
    fillers: () => scoreFillers(text, wordCount, audio, scripted),
    accuracy: () => scoreAccuracy(text, exercise.readingText ?? ''),
    hook: () => scoreHook(text),
    structure: () => scoreStructure(text, exercise),
    clarity: () => scoreClarity(text),
    concreteness: () => scoreConcreteness(text),
  };

  // Only score what this exercise type can honestly measure, then order the
  // exercise's own focus dimensions first so the results screen leads with what
  // the presenter was actually practising.
  const scorable = scorableDimensions(exercise);
  const focus = exercise.focus.filter((d) => scorable.includes(d));
  const extras = scorable.filter((d) => !focus.includes(d));
  const scores = [...focus, ...extras].map((d) => all[d]());

  // Append personal-baseline delta to each measured dimension's detail when
  // the change from the previous attempt is >=5 points (informative, not noisy).
  if (previous) {
    for (const ds of scores) {
      const prev = previous[ds.dimension];
      if (ds.measured && typeof prev === 'number') {
        const delta = ds.score - prev;
        if (Math.abs(delta) >= 5) {
          const sign = delta > 0 ? 'up' : 'down';
          ds.detail += ` (${sign} ${Math.abs(delta)} from last time)`;
        }
      }
    }
  }

  // Overall = weighted average with focus dimensions counted 2x the extras,
  // so the headline number reflects what the rep was actually practising
  // rather than getting outvoted by dimensions that were merely along for
  // the ride. Falls back to all scores if none are measured; never divides
  // by zero.
  const focusScores = scores.filter((s) => focus.includes(s.dimension));
  const measured = scores.filter((s) => s.measured);
  const base = measured.length ? measured : scores;
  const weightOf = (s: DimensionScore) => (focus.includes(s.dimension) ? 2 : 1);
  const totalWeight = base.reduce((a, s) => a + weightOf(s), 0);
  let overallScore =
    totalWeight === 0 ? 0 : clamp(base.reduce((a, s) => a + s.score * weightOf(s), 0) / totalWeight);

  // Under 25 words there isn't enough signal to justify a confident score —
  // a near-empty take must not be able to coast on a couple of strong
  // dimensions (e.g. a fast, well-paced "um").
  const SHORT_TAKE_WORDS = 25;
  const isShortTake = wordCount < SHORT_TAKE_WORDS;
  if (isShortTake) overallScore = Math.min(overallScore, 55);

  const ranked = [...scores].filter((s) => s.measured).sort((a, b) => b.score - a.score);
  const strengths = ranked.filter((s) => s.score >= 75).slice(0, 3).map((s) => s.detail);
  const improvements = ranked.filter((s) => s.score < 70).reverse().slice(0, 3).map((s) => s.detail);

  // The per-dimension scores above are untouched by the short-take cap, so on
  // their own they can look fine (or even blank the improvements list) while
  // the headline score sits at 55 — that would read as a bug, not a signal.
  // Say plainly why the score is capped instead of leaving it unexplained.
  const SHORT_TAKE_NOTE = `Only ${wordCount} word${wordCount === 1 ? '' : 's'} — too little to score with confidence. Say more next take.`;
  if (isShortTake) {
    improvements.unshift(SHORT_TAKE_NOTE);
    improvements.length = Math.min(improvements.length, 3);
  }

  // Fallbacks so the screen is never empty.
  if (strengths.length === 0 && ranked.length) strengths.push(ranked[0].detail);
  const weakest = ranked.length ? ranked[ranked.length - 1] : focusScores[0];
  const quickWin = isShortTake
    ? 'Next take: keep talking — a full take gives the coach enough to score fairly.'
    : weakest
    ? quickWinFor(weakest.dimension)
    : 'Record one more take and compare your scores.';

  // "One thing" — the single deliberate-practice cue for the next rep.
  const primaryDimension = weakest?.dimension;
  const primaryCue = weakest ? quickWinFor(weakest.dimension) : undefined;

  // XP: base reward scaled by performance, with a guaranteed floor for showing up.
  // Range: [0.6, 1.0] of base XP (score 0 → 60%, score 100 → 100%).
  const xpEarned = Math.round(exercise.xp * (0.6 + (overallScore / 100) * 0.4));

  return { overallScore, scores, strengths, improvements, quickWin, wordCount, fillerCount, xpEarned, primaryCue, primaryDimension };
}

function quickWinFor(d: Dimension): string {
  const wins: Record<Dimension, string> = {
    pace: 'Next take: slow to your calmest pace. In a room, slower reads as more senior.',
    pauses: 'Next take: take one full, silent second before your key number and before your ask.',
    intonation: 'Next take: lift your pitch on the words that carry the meaning — the metric, the verb, the ask.',
    energy: 'Next take: say your headline noticeably louder and slower than the words around it.',
    fillers: 'Next take: when you feel an "um" coming, close your mouth and breathe instead.',
    accuracy: 'Next take: read the passage through silently once first, then record it in one pass.',
    hook: 'Next take: open with your recommendation in one sentence, then back it up.',
    structure: 'Next take: plan three beats first — point, evidence, so-what — then record.',
    clarity: 'Next take: keep every sentence under ~15 words. One idea at a time.',
    concreteness: 'Next take: swap one vague phrase for a specific number, name, or example.',
  };
  return wins[d];
}
