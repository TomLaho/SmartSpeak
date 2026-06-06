/**
 * Web Worker: runs the synchronous speech DSP off the main thread so the
 * "Analysing…" UI stays perfectly smooth. Receives transferred PCM, returns
 * the computed AudioMetrics. Any failure is reported so the caller can fall
 * back to a main-thread analysis.
 */
import { analyzePcm } from './audio-dsp';

const ctx: any = self;

ctx.onmessage = (e: MessageEvent) => {
  const { pcm, sampleRate, wordCount, calibration } = (e.data ?? {}) as {
    pcm: ArrayBuffer;
    sampleRate: number;
    wordCount?: number;
    calibration?: { noiseFloorRms: number; speakingRms?: number };
  };
  try {
    const metrics = analyzePcm(new Float32Array(pcm), sampleRate, wordCount, calibration);
    ctx.postMessage(metrics);
  } catch {
    ctx.postMessage({ __error: true });
  }
};

export {};
