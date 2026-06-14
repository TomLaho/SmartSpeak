'use client';

import type { AudioMetrics } from './audio-analysis';
import { DIMENSION_LABELS, type Dimension, type Exercise } from './exercises';

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

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

// ─────────────────────────── Delivery scorers ───────────────────────────

function scorePace(audio: AudioMetrics): DimensionScore {
  // Prefer exact word-based pace when a transcript is available; otherwise use
  // the transcript-free estimate derived from the audio's syllable rate.
  const exact = audio.articulationWpm ?? audio.wpm;
  const wpm = exact ?? audio.estimatedWpm;
  if (!wpm) {
    return dim('pace', 70, 'Speak a little longer so we can measure your pace from the audio.', false);
  }
  const src = exact ? '' : ' (estimated from your audio)';
  const score = bell(wpm, 145, 75);
  let detail: string;
  if (wpm < 110) detail = `~${wpm} wpm${src} — a touch slow. A little more momentum keeps the energy up.`;
  else if (wpm > 185) detail = `~${wpm} wpm${src} — quite fast. Slow down ~10% so each point can land.`;
  else detail = `~${wpm} wpm${src} — right in the confident, easy-to-follow zone.`;
  return dim('pace', score, detail, true);
}

function scorePauses(audio: AudioMetrics): DimensionScore {
  if (audio.unavailable) return dim('pauses', 70, 'Pause analysis needs the audio recording.', false);
  const ppm = audio.pausesPerMin;
  const score = bell(ppm, 9, 9);
  let detail: string;
  if (ppm < 3) detail = `Only ${audio.pauseCount} clear pause(s). Build in silence before key points.`;
  else if (ppm > 18) detail = `Lots of pausing (${ppm}/min). Some hesitation — try shorter, more deliberate breaks.`;
  else detail = `${audio.pauseCount} well-placed pauses. Nice use of silence to shape your delivery.`;
  if (audio.longPauseCount >= 3) detail += ` (${audio.longPauseCount} long gaps — keep them intentional.)`;
  return dim('pauses', score, detail, true);
}

function scoreIntonation(audio: AudioMetrics): DimensionScore {
  if (audio.unavailable || audio.pitch.voicedRatio < 0.15) {
    return dim('intonation', 65, "Couldn't track pitch clearly — record somewhere quiet for this one.", false);
  }
  const v = audio.pitch.variationSemitones;
  // Monotone ≈ <1.5 st; expressive ≈ 2.5-6 st.
  const score = v < 1.5 ? clamp(v / 1.5 * 55) : clamp(55 + bell(v, 4, 4) * 0.45);
  let detail: string;
  if (v < 1.5) detail = `Fairly monotone (${v} semitones of pitch movement). Let your voice rise and fall more.`;
  else if (v > 8) detail = `Very animated pitch (${v} semitones). Great energy — just keep it controlled.`;
  else detail = `Lively intonation (${v} semitones of variation). Your voice carries the meaning well.`;
  return dim('intonation', score, detail, true);
}

function scoreEnergy(audio: AudioMetrics): DimensionScore {
  if (audio.unavailable) return dim('energy', 70, 'Volume dynamics need the audio recording.', false);
  const range = audio.energy.dynamicRangeDb;
  const score = range < 5 ? clamp((range / 5) * 55) : clamp(55 + bell(range, 13, 12) * 0.45);
  let detail =
    range < 5
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

function scoreFillers(text: string, words: number, audio: AudioMetrics): DimensionScore {
  // Acoustic "uh/um" hesitations come straight from the audio; lexical fillers
  // ("like", "you know", …) come from the transcript when we have one.
  const lexical = words >= 5 ? countOccurrences(' ' + text.toLowerCase() + ' ', LEXICAL_FILLERS) : 0;
  const acoustic = audio.unavailable ? 0 : audio.filledPauseCount;
  const total = lexical + acoustic;

  const speakingMin = audio.speakingSec > 0 ? audio.speakingSec / 60 : 0;
  if (!speakingMin && words < 5) {
    return dim('fillers', 70, 'Speak a little more to measure filler words.', false);
  }
  // Rate per minute of speaking time so it works with or without a transcript.
  const perMin = speakingMin ? total / speakingMin : (total / Math.max(1, words)) * 130;
  const score = clamp(100 - perMin * 6);

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

  const lexicalFillers = wordCount >= 5 ? countOccurrences(' ' + text.toLowerCase() + ' ', LEXICAL_FILLERS) : 0;
  const fillerCount = lexicalFillers + (audio.unavailable ? 0 : audio.filledPauseCount);

  const all: Record<Dimension, () => DimensionScore> = {
    pace: () => scorePace(audio),
    pauses: () => scorePauses(audio),
    intonation: () => scoreIntonation(audio),
    energy: () => scoreEnergy(audio),
    fillers: () => scoreFillers(text, wordCount, audio),
    hook: () => scoreHook(text),
    structure: () => scoreStructure(text, exercise),
    clarity: () => scoreClarity(text),
    concreteness: () => scoreConcreteness(text),
  };

  // Score the exercise's focus dimensions first, then fill in the rest so the
  // results screen always has a rounded picture.
  const focus = exercise.focus;
  const extras = (Object.keys(all) as Dimension[]).filter((d) => !focus.includes(d));
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

  // Overall = weighted toward the exercise's focus dimensions.
  const focusScores = scores.filter((s) => focus.includes(s.dimension));
  const measuredFocus = focusScores.filter((s) => s.measured);
  const base = measuredFocus.length ? measuredFocus : focusScores;
  const overallScore = clamp(base.reduce((a, s) => a + s.score, 0) / base.length);

  const ranked = [...scores].filter((s) => s.measured).sort((a, b) => b.score - a.score);
  const strengths = ranked.filter((s) => s.score >= 75).slice(0, 3).map((s) => s.detail);
  const improvements = ranked.filter((s) => s.score < 70).reverse().slice(0, 3).map((s) => s.detail);

  // Fallbacks so the screen is never empty.
  if (strengths.length === 0 && ranked.length) strengths.push(ranked[0].detail);
  const weakest = ranked.length ? ranked[ranked.length - 1] : focusScores[0];
  const quickWin = weakest ? quickWinFor(weakest.dimension) : 'Record one more take and compare your scores.';

  // "One thing" — the single deliberate-practice cue for the next rep.
  const primaryDimension = weakest?.dimension;
  const primaryCue = weakest ? quickWinFor(weakest.dimension) : undefined;

  // XP: base reward scaled by performance, with a guaranteed floor for showing up.
  const xpEarned = Math.round(exercise.xp * (0.6 + (overallScore / 100) * 0.6));

  return { overallScore, scores, strengths, improvements, quickWin, wordCount, fillerCount, xpEarned, primaryCue, primaryDimension };
}

function quickWinFor(d: Dimension): string {
  const wins: Record<Dimension, string> = {
    pace: 'Next take: slow to your calmest pace. In a room, slower reads as more senior.',
    pauses: 'Next take: take one full, silent second before your key number and before your ask.',
    intonation: 'Next take: lift your pitch on the words that carry the meaning — the metric, the verb, the ask.',
    energy: 'Next take: say your headline noticeably louder and slower than the words around it.',
    fillers: 'Next take: when you feel an "um" coming, close your mouth and breathe instead.',
    hook: 'Next take: open with your recommendation in one sentence, then back it up.',
    structure: 'Next take: plan three beats first — point, evidence, so-what — then record.',
    clarity: 'Next take: keep every sentence under ~15 words. One idea at a time.',
    concreteness: 'Next take: swap one vague phrase for a specific number, name, or example.',
  };
  return wins[d];
}
