import { clamp } from 'lodash';

const fillers = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically', 'literally'];
const signposts = ['first', 'second', 'third', 'finally', 'in conclusion', 'to summarize'];

export type Metrics = {
  totalWords: number;
  wordsPerMinute?: number;
  fillerCounts: {
    countTotal: number;
    perMinute?: number;
    per100Words: number;
    breakdown: Record<string, number>;
  };
  sentenceStats: {
    avgSentenceLength: number;
    longSentenceRatio: number;
  };
  structureProxy: {
    score: number;
    signpostHits: string[];
  };
  simplicityProxy: {
    avgWordLength: number;
    complexWordRatio: number;
  };
  pauseStats: {
    pauseCountApprox: number;
    pausesPerMinuteApprox?: number;
  };
  smartSpeakScore: number;
};

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function computeMetrics(transcript: string, durationSeconds?: number): Metrics {
  const words = transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s\.\,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const totalWords = words.length;
  const wordsPerMinute = durationSeconds ? Number(((totalWords / durationSeconds) * 60).toFixed(1)) : undefined;

  const breakdown: Record<string, number> = {};
  fillers.forEach((f) => (breakdown[f] = 0));

  for (let i = 0; i < words.length; i++) {
    fillers.forEach((filler) => {
      const fillerTokens = filler.split(' ');
      if (fillerTokens.length === 1) {
        if (words[i] === filler) breakdown[filler] += 1;
      } else {
        const segment = words.slice(i, i + fillerTokens.length).join(' ');
        if (segment === filler) breakdown[filler] += 1;
      }
    });
  }

  const fillerCountTotal = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const fillerPerMinute = durationSeconds ? Number(((fillerCountTotal / durationSeconds) * 60).toFixed(2)) : undefined;
  const fillerPer100 = totalWords > 0 ? Number(((fillerCountTotal / totalWords) * 100).toFixed(2)) : 0;

  const sentences = transcript
    .replace(/([.!?])+/g, '. ')
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean);

  const sentenceLengths = sentences.map((s) => countWords(s));
  const avgSentenceLength = sentenceLengths.length ? Number((sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length).toFixed(2)) : 0;
  const longSentenceRatio = sentenceLengths.length
    ? Number((sentenceLengths.filter((len) => len > 25).length / sentenceLengths.length).toFixed(2))
    : 0;

  const signpostHits: string[] = [];
  signposts.forEach((s) => {
    if (transcript.toLowerCase().includes(s)) signpostHits.push(s);
  });
  const structureScore = clamp(Math.round((signpostHits.length / Math.max(3, sentences.length || 1)) * 100), 0, 100);

  const avgWordLength = totalWords ? Number((words.join('').length / totalWords).toFixed(2)) : 0;
  const complexWordRatio = totalWords ? Number((words.filter((w) => w.length > 8).length / totalWords).toFixed(2)) : 0;

  const pauseCountApprox = (transcript.match(/[,\.]/g) || []).length;
  const pausesPerMinuteApprox = durationSeconds ? Number(((pauseCountApprox / durationSeconds) * 60).toFixed(2)) : undefined;

  const paceScore = wordsPerMinute ? clamp(Math.round((1 - Math.abs(wordsPerMinute - 140) / 140) * 100), 0, 100) : 60;
  const fillerScore = clamp(100 - fillerPer100 * 3, 10, 100);
  const structureScoreWeighted = structureScore;
  const simplicityScore = clamp(100 - complexWordRatio * 120 + (8 - avgWordLength) * 5, 10, 100);
  const clarityScore = clamp(100 - longSentenceRatio * 60, 10, 100);

  const smartSpeakScore = Math.round(
    paceScore * 0.25 +
      fillerScore * 0.2 +
      structureScoreWeighted * 0.2 +
      simplicityScore * 0.15 +
      clarityScore * 0.2
  );

  return {
    totalWords,
    wordsPerMinute,
    fillerCounts: {
      countTotal: fillerCountTotal,
      perMinute: fillerPerMinute,
      per100Words: fillerPer100,
      breakdown,
    },
    sentenceStats: {
      avgSentenceLength,
      longSentenceRatio,
    },
    structureProxy: {
      score: structureScore,
      signpostHits,
    },
    simplicityProxy: {
      avgWordLength,
      complexWordRatio,
    },
    pauseStats: {
      pauseCountApprox,
      pausesPerMinuteApprox,
    },
    smartSpeakScore,
  };
}
