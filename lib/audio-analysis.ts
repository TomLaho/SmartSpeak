'use client';

/**
 * Real, in-browser audio analysis for spoken-delivery feedback.
 *
 * Everything here runs client-side on the recorded Blob using the Web Audio
 * API — no upload, no backend. We decode the recording to raw PCM and derive,
 * entirely from the acoustic signal (no transcript required):
 *
 *  - Pace            syllable-nucleus rate from the energy envelope, converted
 *                    to an estimated words/min (transcript-free). When a
 *                    transcript IS available we also report exact word-based wpm.
 *  - Pauses          silence detection via an adaptive energy threshold
 *  - Volume          mean loudness + dynamic range (monotone vs. expressive)
 *  - Tone            pitch (F0) variation via autocorrelation on voiced frames
 *  - Fillers         acoustic "uh/um" filled pauses: elongated, monotone,
 *                    single-nucleus voiced segments bounded by silence
 *
 * The goal is "good enough to coach", not forensic accuracy. All heavy loops
 * are bounded so a multi-minute clip analyses in well under a second.
 */

export interface AudioMetrics {
  durationSec: number;
  speakingSec: number;
  silenceSec: number;
  /** Number of distinct pauses longer than the pause threshold. */
  pauseCount: number;
  /** Pauses longer than ~1.5s. */
  longPauseCount: number;
  avgPauseSec: number;
  pausesPerMin: number;
  /** Syllable nuclei detected in the energy envelope. */
  syllableCount: number;
  /** Syllable nuclei per second of speaking time (transcript-free tempo). */
  syllablesPerSec: number;
  /** Transcript-free pace estimate (words/min) derived from syllable rate. */
  estimatedWpm?: number;
  /** Gross words per minute over the whole clip (needs a word count). */
  wpm?: number;
  /** Articulation rate: words per minute of *speaking* time only. */
  articulationWpm?: number;
  /** Acoustic "uh/um" filled pauses detected from the signal (no transcript). */
  filledPauseCount: number;
  filledPausePerMin: number;
  energy: {
    meanDb: number;
    /** p95 − p10 of frame loudness in dB — the dynamic range of volume. */
    dynamicRangeDb: number;
  };
  pitch: {
    medianHz: number;
    /** Std-dev of pitch in semitones — the headline "intonation" number. */
    variationSemitones: number;
    rangeSemitones: number;
    /** Share of frames that were voiced (had a detectable pitch). */
    voicedRatio: number;
  };
  /** True when decoding/analysis failed and only transcript data is available. */
  unavailable?: boolean;
}

const FRAME_MS = 25; // analysis frame length
const PAUSE_MIN_SEC = 0.35; // silence longer than this counts as a pause
const LONG_PAUSE_SEC = 1.5;
const MIN_F0 = 75; // Hz — low end of human speech
const MAX_F0 = 400; // Hz — high end of conversational speech

// Syllable-nucleus detection.
const SYLL_MIN_GAP_SEC = 0.11; // ≥ ~9 syllables/sec ceiling — avoids double counts
const SYLL_MIN_DIP_DB = 2.5; // intensity must dip this much between nuclei
const SYLL_PEAK_FLOOR_BELOW_MEDIAN_DB = 9; // nuclei sit near/above median loudness
const SYLLABLES_PER_WORD = 1.4; // English average, for wpm estimation

// Acoustic filled-pause ("uh/um") detection.
const FILLER_MIN_SEC = 0.38; // elongated — longer than a typical content monosyllable
const FILLER_MAX_SEC = 1.5;
const FILLER_MAX_SEMITONE_STD = 0.5; // very flat pitch

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sorted: number[], p: number): number {
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

/**
 * Estimate fundamental frequency of one frame via normalized autocorrelation.
 * Returns 0 when the frame is unvoiced / too quiet to be reliable.
 */
function detectPitch(frame: Float32Array, sampleRate: number): number {
  const size = frame.length;

  // Energy gate: skip near-silent frames.
  let sumSquares = 0;
  for (let i = 0; i < size; i++) sumSquares += frame[i] * frame[i];
  const rms = Math.sqrt(sumSquares / size);
  if (rms < 0.01) return 0;

  const minLag = Math.floor(sampleRate / MAX_F0);
  const maxLag = Math.min(size - 1, Math.floor(sampleRate / MIN_F0));

  let bestLag = -1;
  let bestCorr = 0;
  let foundDip = false; // wait until correlation first dips, to skip lag 0 peak

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

  // Require a reasonably strong periodicity to call it voiced.
  if (bestLag <= 0 || bestCorr < (sumSquares / size) * 0.3) return 0;
  return sampleRate / bestLag;
}

export async function analyzeAudio(blob: Blob, wordCount?: number): Promise<AudioMetrics> {
  const empty: AudioMetrics = {
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

  try {
    const Ctx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return empty;

    const ctx = new Ctx();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    await ctx.close();

    const sampleRate = audioBuffer.sampleRate;
    const data = audioBuffer.getChannelData(0);
    const durationSec = audioBuffer.duration;

    const frameSize = Math.max(256, Math.floor((FRAME_MS / 1000) * sampleRate));
    const frameCount = Math.floor(data.length / frameSize);
    if (frameCount === 0) return { ...empty, durationSec };
    const frameSec = frameSize / sampleRate;

    // 1) Per-frame RMS energy.
    const rms = new Float32Array(frameCount);
    for (let f = 0; f < frameCount; f++) {
      let sum = 0;
      const start = f * frameSize;
      for (let i = 0; i < frameSize; i++) {
        const s = data[start + i];
        sum += s * s;
      }
      rms[f] = Math.sqrt(sum / frameSize);
    }

    // 2) Adaptive silence threshold from the energy distribution.
    const sortedRms = [...rms].sort((a, b) => a - b);
    const noiseFloor = percentile(sortedRms, 10);
    const loud = percentile(sortedRms, 90);
    const threshold = Math.max(noiseFloor + (loud - noiseFloor) * 0.18, 0.008);

    // 3) Segment speech vs. silence: collect speaking segments + pauses.
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

    // 4) Volume: energy dynamics in dB over speaking frames.
    const voicedDb: number[] = [];
    for (let f = 0; f < frameCount; f++) {
      if (rms[f] >= threshold) voicedDb.push(20 * Math.log10(rms[f] + 1e-7));
    }
    const sortedDb = [...voicedDb].sort((a, b) => a - b);
    const meanDb = voicedDb.length ? voicedDb.reduce((a, b) => a + b, 0) / voicedDb.length : -60;
    const dynamicRangeDb = voicedDb.length ? percentile(sortedDb, 95) - percentile(sortedDb, 10) : 0;
    const medianVoicedDb = voicedDb.length ? percentile(sortedDb, 50) : -60;

    // 5) Pace: count syllable nuclei as peaks in a smoothed loudness envelope.
    const env = new Float32Array(frameCount);
    for (let f = 0; f < frameCount; f++) env[f] = 20 * Math.log10(rms[f] + 1e-7);
    const sm = new Float32Array(frameCount); // 5-frame moving average (~125ms)
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

    // 6) Tone: pitch tracking on a bounded sample of voiced frames.
    const maxPitchFrames = 1600; // keep total work bounded for long clips
    const step = Math.max(1, Math.ceil(frameCount / maxPitchFrames));
    const f0s: number[] = [];
    const f0ByFrame = new Float32Array(frameCount); // 0 where unvoiced / not sampled
    const pitchFrameSize = Math.floor((40 / 1000) * sampleRate); // 40ms gives ≥1 period at 75Hz
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

    // 7) Fillers: elongated, monotone, single-nucleus voiced segments ("uh/um").
    let filledPauseCount = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const durSec = (seg.end - seg.start + 1) * frameSec;
      if (durSec < FILLER_MIN_SEC || durSec > FILLER_MAX_SEC) continue;
      if (segNuclei[i] > 1) continue; // multiple syllables → it's a word, not a hesitation
      const segF0: number[] = [];
      for (let f = seg.start; f <= seg.end; f++) if (f0ByFrame[f] > 0) segF0.push(f0ByFrame[f]);
      if (segF0.length < 3) continue; // needs sustained voicing
      if (stdevSemitones(segF0) <= FILLER_MAX_SEMITONE_STD) filledPauseCount++;
    }
    const filledPausePerMin = durationSec ? (filledPauseCount / durationSec) * 60 : 0;

    const wpm = wordCount && durationSec ? (wordCount / durationSec) * 60 : undefined;
    const articulationWpm =
      wordCount && speakingSec > 1 ? (wordCount / speakingSec) * 60 : undefined;

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
      energy: { meanDb: round(meanDb, 1), dynamicRangeDb: round(dynamicRangeDb, 1) },
      pitch: {
        medianHz: Math.round(medianHz),
        variationSemitones: round(variationSemitones, 2),
        rangeSemitones: round(rangeSemitones, 1),
        voicedRatio: round(voicedRatio, 2),
      },
    };
  } catch (err) {
    console.warn('[audio-analysis] failed; falling back to transcript-only metrics', err);
    return empty;
  }
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
