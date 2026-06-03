'use client';

/**
 * Browser glue for the speech DSP.
 *
 * `decodeAudioData` already runs off the main JS thread (it returns a promise
 * and decodes on the browser's audio thread), so the only blocking work is the
 * synchronous DSP in `analyzePcm`. `analyzeAudioInWorker` ships that DSP to a
 * Web Worker — keeping the UI perfectly smooth during analysis — and falls back
 * to running it inline if Workers are unavailable or error out, so the workflow
 * is never slower than before.
 */

import {
  analyzePcm,
  UNAVAILABLE_METRICS,
  type AudioMetrics,
  type CalibrationInput,
} from './audio-dsp';

export type { AudioMetrics, CalibrationInput } from './audio-dsp';

async function decode(blob: Blob): Promise<{ data: Float32Array; sampleRate: number } | null> {
  const Ctx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return { data: audioBuffer.getChannelData(0), sampleRate: audioBuffer.sampleRate };
  } finally {
    ctx.close().catch(() => {});
  }
}

/** Decode + analyse on the main thread (used directly and as the worker fallback). */
export async function analyzeAudio(
  blob: Blob,
  wordCount?: number,
  calibration?: CalibrationInput
): Promise<AudioMetrics> {
  try {
    const decoded = await decode(blob);
    if (!decoded) return UNAVAILABLE_METRICS;
    return analyzePcm(decoded.data, decoded.sampleRate, wordCount, calibration);
  } catch (err) {
    console.warn('[audio-analysis] failed; falling back to transcript-only metrics', err);
    return UNAVAILABLE_METRICS;
  }
}

function runInWorker(
  data: Float32Array,
  sampleRate: number,
  wordCount: number | undefined,
  calibration: CalibrationInput | undefined
): Promise<AudioMetrics> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./audio-analyzer.worker.ts', import.meta.url));
    // Copy to a fresh buffer we can transfer (zero-copy) to the worker.
    const pcm = data.slice();
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('audio worker timed out'));
    }, 8000);
    worker.onmessage = (e: MessageEvent) => {
      clearTimeout(timeout);
      worker.terminate();
      const m = e.data as AudioMetrics & { __error?: boolean };
      if (m && m.__error) reject(new Error('audio worker error'));
      else resolve(m);
    };
    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      reject((e as ErrorEvent).error ?? new Error('audio worker error'));
    };
    worker.postMessage({ pcm: pcm.buffer, sampleRate, wordCount, calibration }, [pcm.buffer]);
  });
}

/** Decode on the main thread, then run the DSP in a Web Worker (with fallback). */
export async function analyzeAudioInWorker(
  blob: Blob,
  wordCount?: number,
  calibration?: CalibrationInput
): Promise<AudioMetrics> {
  let decoded: { data: Float32Array; sampleRate: number } | null = null;
  try {
    decoded = await decode(blob);
  } catch (err) {
    console.warn('[audio-analysis] decode failed', err);
  }
  if (!decoded) return UNAVAILABLE_METRICS;

  if (typeof Worker !== 'undefined') {
    try {
      return await runInWorker(decoded.data, decoded.sampleRate, wordCount, calibration);
    } catch (err) {
      console.warn('[audio-analysis] worker unavailable; analysing on main thread', err);
    }
  }
  return analyzePcm(decoded.data, decoded.sampleRate, wordCount, calibration);
}
