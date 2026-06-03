/**
 * Pure speech DSP — no DOM, no Web Audio, no React.
 *
 * This module operates on already-decoded PCM so it can run identically on the
 * main thread or inside a Web Worker. The browser-only decode step lives in
 * `audio-analysis.ts`, which calls into `analyzePcm` here.
 *
 * Everything is derived from the acoustic signal (no transcript required):
 *  - Pace     syllable-nucleus rate from the energy envelope → estimated wpm
 *  - Pauses   silence detection via an adaptive (optionally calibrated) gate
 *  - Volume   mean loudness + dynamic range (+ vs. the user's calibrated level)
 *  - Tone     pitch (F0) variation via autocorrelation on voiced frames
 *  - Fillers  acoustic "uh/um" filled pauses (elongated, monotone, 1 nucleus)
 */

export interface AudioMetrics {
  durationSec: number;
  speakingSec: number;
  silenceSec: number;
  pauseCount: number;
  longPauseCount: number;
  avgPauseSec: number;
  pausesPerMin: number;
  syllableCount: number;
  syllablesPerSec: number;
  estimatedWpm?: number;
  wpm?: number;
  articulationWpm?: number;
  filledPauseCount: number;
  filledPausePerMin: number;
  energy: {
    meanDb: number;
    dynamicRangeDb: number;
    /** Loudness vs. the user's calibrated speaking level, in dB (if calibrated). */
    vsBaselineDb?: number;
  };
  pitch: {
    medianHz: number;
    variationSemitones: number;
    rangeSemitones: number;
    voicedRatio: number;
  };
  /** True when decoding/analysis failed and only transcript data is available. */
  unavailable?: boolean;
}

/** Per-user, per-mic levels measured during calibration. */
export interface CalibrationInput {
  noiseFloorRms: number;
  speakingRms?: number;
}

const FRAME_MS = 25; // analysis frame length
const PAUSE_MIN_SEC = 0.35; // silence longer than this counts as a pause
const LONG_PAUSE_SEC = 1.5;
const MIN_F0 = 75; // Hz — low end of human speech
const MAX_F0 = 400; // Hz — high end of conversational speech

const SYLL_MIN_GAP_SEC = 0.11;
const SYLL_MIN_DIP_DB = 2.5;
const SYLL_PEAK_FLOOR_BELOW_MEDIAN_DB = 9;
const SYLLABLES_PER_WORD = 1.4;

const FILLER_MIN_SEC = 0.38;
const FILLER_MAX_SEC = 1.5;
const FILLER_MAX_SEMITONE_STD = 0.5;

export const UNAVAILABLE_METRICS: AudioMetrics = {
  durationSec: 0,
  speakingSec: 0,
  silenceSec: 0,
  pauseCount: 0,
  longPauseCount: 0,
  avgPauseSec: 0,
  pausesPerMin: 0,
  syllableCount: 0,
  syllablesPerSec: 0,
  filledPauseCount: 0,
  filledPausePerMin: 0,
  energy: { meanDb: -60, dynamicRangeDb: 0 },
  pitch: { medianHz: 0, variationSemitones: 0, rangeSemitones: 0, voicedRatio: 0 },
  unavailable: true,
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function stdevSemitones(f0s: number[]): number {
  if (f0s.length < 2) return 0;
  const med = median(f0s);
  if (med <= 0) return 0;
  const semis = f0s.map((hz) => 12 * Math.log2(hz / med));
  const mean = semis.reduce((a, b) => a + b, 0) / semis.length;
  const variance = semis.reduce((a, b) => a + (b - mean) ** 2, 0) / semis.length;
  return Math.sqrt(variance);
}

/** Per-frame RMS energy — shared by analysis and calibration. */
export function frameRmsValues(
  data: Float32Array,
  sampleRate: number
): { rms: Float32Array; frameSec: number; frameSize: number } {
  const frameSize = Math.max(256, Math.floor((FRAME_MS / 1000) * sampleRate));
  const frameCount = Math.floor(data.length / frameSize);
  const rms = new Float32Array(Math.max(0, frameCount));
  for (let f = 0; f < frameCount; f++) {
    let sum = 0;
    const start = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const s = data[start + i];
      sum += s * s;
    }
    rms[f] = Math.sqrt(sum / frameSize);
  }
  return { rms, frameSec: frameSize / sampleRate, frameSize };
}

/**
 * Estimate fundamental frequency of one frame via normalized autocorrelation.
 * Returns 0 when the frame is unvoiced / too quiet to be reliable.
 */
function detectPitch(frame: Float32Array, sampleRate: number): number {
  const size = frame.length;

  let sumSquares = 0;
  for (let i = 0; i < size; i++) sumSquares += frame[i] * frame[i];
  const rms = Math.sqrt(sumSquares / size);
  if (rms < 0.01) return 0;

  const minLag = Math.floor(sampleRate / MAX_F0);
  const maxLag = Math.min(size - 1, Math.floor(sampleRate / MIN_F0));

  let bestLag = -1;
  let bestCorr = 0;
  let foundDip = false;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < size - lag; i++) corr += frame[i] * frame[i + lag];
    corr /= size - lag;

    if (!foundDip && corr < 0) foundDip = true;
    if (foundDip && corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorr < (sumSquares / size) * 0.3) return 0;
  return sampleRate / bestLag;
}

/**
 * Analyse decoded PCM into delivery metrics. Pure and synchronous — safe to run
 * in a Web Worker. `calibration` (optional) tightens the silence gate and lets
 * us report loudness relative to the user's normal speaking level.
 */
export function analyzePcm(
  data: Float32Array,
  sampleRate: number,
  wordCount?: number,
  calibration?: CalibrationInput
): AudioMetrics {
  const durationSec = data.length / sampleRate;
  const { rms, frameSec, frameSize } = frameRmsValues(data, sampleRate);
  const frameCount = rms.length;
  if (frameCount === 0) return { ...UNAVAILABLE_METRICS, durationSec };

  // Adaptive silence threshold from the energy distribution, raised to sit above
  // the calibrated noise floor when we have one (more reliable in noisy rooms).
  const sortedRms = [...rms].sort((a, b) => a - b);
  const noiseFloor = percentile(sortedRms, 10);
  const loud = percentile(sortedRms, 90);
  let threshold = Math.max(noiseFloor + (loud - noiseFloor) * 0.18, 0.008);
  if (calibration?.noiseFloorRms && calibration.noiseFloorRms > 0) {
    threshold = Math.max(threshold, calibration.noiseFloorRms * 1.8);
  }

  // Segment speech vs. silence.
  const segments: Array<{ start: number; end: number }> = [];
  const segOf = new Int32Array(frameCount).fill(-1);
  let speakingFrames = 0;
  const pauseDurations: number[] = [];
  let runSilent = 0;
  let segStart = -1;
  for (let f = 0; f < frameCount; f++) {
    if (rms[f] >= threshold) {
      if (segStart < 0) segStart = f;
      if (runSilent * frameSec >= PAUSE_MIN_SEC) pauseDurations.push(runSilent * frameSec);
      runSilent = 0;
      speakingFrames++;
    } else {
      if (segStart >= 0) {
        segments.push({ start: segStart, end: f - 1 });
        segStart = -1;
      }
      runSilent++;
    }
  }
  if (segStart >= 0) segments.push({ start: segStart, end: frameCount - 1 });
  segments.forEach((seg, idx) => {
    for (let f = seg.start; f <= seg.end; f++) segOf[f] = idx;
  });

  const speakingSec = speakingFrames * frameSec;
  const silenceSec = Math.max(0, durationSec - speakingSec);
  const pauseCount = pauseDurations.length;
  const longPauseCount = pauseDurations.filter((d) => d >= LONG_PAUSE_SEC).length;
  const avgPauseSec = pauseCount ? pauseDurations.reduce((a, b) => a + b, 0) / pauseCount : 0;
  const pausesPerMin = durationSec ? (pauseCount / durationSec) * 60 : 0;

  // Volume: energy dynamics in dB over speaking frames.
  const voicedDb: number[] = [];
  for (let f = 0; f < frameCount; f++) {
    if (rms[f] >= threshold) voicedDb.push(20 * Math.log10(rms[f] + 1e-7));
  }
  const sortedDb = [...voicedDb].sort((a, b) => a - b);
  const meanDb = voicedDb.length ? voicedDb.reduce((a, b) => a + b, 0) / voicedDb.length : -60;
  const dynamicRangeDb = voicedDb.length ? percentile(sortedDb, 95) - percentile(sortedDb, 10) : 0;
  const medianVoicedDb = voicedDb.length ? percentile(sortedDb, 50) : -60;
  let vsBaselineDb: number | undefined;
  if (calibration?.speakingRms && calibration.speakingRms > 0 && voicedDb.length) {
    vsBaselineDb = round(medianVoicedDb - 20 * Math.log10(calibration.speakingRms + 1e-7), 1);
  }

  // Pace: count syllable nuclei as peaks in a smoothed loudness envelope.
  const env = new Float32Array(frameCount);
  for (let f = 0; f < frameCount; f++) env[f] = 20 * Math.log10(rms[f] + 1e-7);
  const sm = new Float32Array(frameCount);
  for (let f = 0; f < frameCount; f++) {
    let s = 0;
    let n = 0;
    for (let k = -2; k <= 2; k++) {
      const j = f + k;
      if (j >= 0 && j < frameCount) {
        s += env[j];
        n++;
      }
    }
    sm[f] = s / n;
  }
  const peakFloor = medianVoicedDb - SYLL_PEAK_FLOOR_BELOW_MEDIAN_DB;
  const minGapFrames = Math.max(3, Math.round(SYLL_MIN_GAP_SEC / frameSec));
  const segNuclei = new Int32Array(segments.length);
  let syllableCount = 0;
  let lastPeakF = -minGapFrames - 1;
  let valley = Infinity;
  for (let f = 1; f < frameCount - 1; f++) {
    if (rms[f] < threshold) {
      valley = Math.min(valley, sm[f]);
      continue;
    }
    if (sm[f] < valley) valley = sm[f];
    const isLocalMax = sm[f] >= sm[f - 1] && sm[f] > sm[f + 1];
    if (
      isLocalMax &&
      sm[f] >= peakFloor &&
      sm[f] - valley >= SYLL_MIN_DIP_DB &&
      f - lastPeakF >= minGapFrames
    ) {
      syllableCount++;
      if (segOf[f] >= 0) segNuclei[segOf[f]]++;
      lastPeakF = f;
      valley = sm[f];
    }
  }
  const syllablesPerSec = speakingSec > 0 ? syllableCount / speakingSec : 0;
  const estimatedWpm =
    speakingSec > 0.6 && syllableCount >= 3
      ? Math.round((syllableCount / SYLLABLES_PER_WORD / speakingSec) * 60)
      : undefined;

  // Tone: pitch tracking on a bounded sample of voiced frames.
  const maxPitchFrames = 1600;
  const step = Math.max(1, Math.ceil(frameCount / maxPitchFrames));
  const f0s: number[] = [];
  const f0ByFrame = new Float32Array(frameCount);
  const pitchFrameSize = Math.floor((40 / 1000) * sampleRate);
  for (let f = 0; f < frameCount; f += step) {
    const start = f * frameSize;
    if (start + pitchFrameSize >= data.length) break;
    if (rms[f] < threshold) continue;
    const frame = data.subarray(start, start + pitchFrameSize);
    const f0 = detectPitch(frame, sampleRate);
    if (f0 >= MIN_F0 && f0 <= MAX_F0) {
      f0s.push(f0);
      f0ByFrame[f] = f0;
    }
  }

  const analysedFrames = Math.ceil(frameCount / step);
  const voicedRatio = analysedFrames ? f0s.length / analysedFrames : 0;
  const medianHz = median(f0s);
  let variationSemitones = 0;
  let rangeSemitones = 0;
  if (f0s.length > 2 && medianHz > 0) {
    const semis = f0s.map((hz) => 12 * Math.log2(hz / medianHz));
    variationSemitones = stdevSemitones(f0s);
    const sortedSemis = [...semis].sort((a, b) => a - b);
    rangeSemitones = percentile(sortedSemis, 95) - percentile(sortedSemis, 5);
  }

  // Fillers: elongated, monotone, single-nucleus voiced segments ("uh/um").
  let filledPauseCount = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const durSec = (seg.end - seg.start + 1) * frameSec;
    if (durSec < FILLER_MIN_SEC || durSec > FILLER_MAX_SEC) continue;
    if (segNuclei[i] > 1) continue;
    const segF0: number[] = [];
    for (let f = seg.start; f <= seg.end; f++) if (f0ByFrame[f] > 0) segF0.push(f0ByFrame[f]);
    if (segF0.length < 3) continue;
    if (stdevSemitones(segF0) <= FILLER_MAX_SEMITONE_STD) filledPauseCount++;
  }
  const filledPausePerMin = durationSec ? (filledPauseCount / durationSec) * 60 : 0;

  const wpm = wordCount && durationSec ? (wordCount / durationSec) * 60 : undefined;
  const articulationWpm = wordCount && speakingSec > 1 ? (wordCount / speakingSec) * 60 : undefined;

  return {
    durationSec: round(durationSec, 1),
    speakingSec: round(speakingSec, 1),
    silenceSec: round(silenceSec, 1),
    pauseCount,
    longPauseCount,
    avgPauseSec: round(avgPauseSec, 2),
    pausesPerMin: round(pausesPerMin, 1),
    syllableCount,
    syllablesPerSec: round(syllablesPerSec, 2),
    estimatedWpm,
    wpm: wpm ? Math.round(wpm) : undefined,
    articulationWpm: articulationWpm ? Math.round(articulationWpm) : undefined,
    filledPauseCount,
    filledPausePerMin: round(filledPausePerMin, 1),
    energy: { meanDb: round(meanDb, 1), dynamicRangeDb: round(dynamicRangeDb, 1), vsBaselineDb },
    pitch: {
      medianHz: Math.round(medianHz),
      variationSemitones: round(variationSemitones, 2),
      rangeSemitones: round(rangeSemitones, 1),
      voicedRatio: round(voicedRatio, 2),
    },
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
