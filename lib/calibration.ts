'use client';

/**
 * Microphone calibration.
 *
 * A ~2-second "speak normally" sample lets us learn the user's room + mic: the
 * ambient noise floor and their typical speaking level. We persist it and feed
 * it into the analysis (lib/audio-dsp) to set a more reliable silence gate and
 * to report loudness relative to their own normal. Entirely on-device.
 */

import { percentile, type CalibrationInput } from './audio-dsp';

export interface CalibrationProfile {
  noiseFloorRms: number;
  speakingRms: number;
  speakingDb: number;
  date: string;
}

const KEY = 'smartspeak.calibration.v1';
const DISMISS_KEY = 'smartspeak.calibration.dismissed.v1';

export function loadCalibration(): CalibrationProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CalibrationProfile) : null;
  } catch {
    return null;
  }
}

export function saveCalibration(profile: CalibrationProfile): CalibrationProfile {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
  return profile;
}

export function clearCalibration(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function isCalibrationNudgeDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissCalibrationNudge(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Map a stored profile to the lean shape the DSP consumes. */
export function toCalibrationInput(profile: CalibrationProfile | null): CalibrationInput | undefined {
  if (!profile) return undefined;
  return { noiseFloorRms: profile.noiseFloorRms, speakingRms: profile.speakingRms };
}

/**
 * Capture `seconds` of live mic input and derive the noise floor + speaking
 * level. Resolves with the saved profile; throws if mic access is denied.
 */
export async function captureCalibration(seconds = 2): Promise<CalibrationProfile> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    const Ctx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio is not available in this browser.');
    const ctx = new Ctx();
    try {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const samples: number[] = [];
      const startedAt = performance.now();

      await new Promise<void>((resolve) => {
        const tick = () => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          samples.push(Math.sqrt(sum / buf.length));
          if (performance.now() - startedAt >= seconds * 1000) resolve();
          else requestAnimationFrame(tick);
        };
        tick();
      });

      const sorted = [...samples].sort((a, b) => a - b);
      const noiseFloorRms = percentile(sorted, 20); // quiet gaps / ambient
      const speakingRms = Math.max(noiseFloorRms * 1.5, percentile(sorted, 70)); // typical voiced level
      const speakingDb = 20 * Math.log10(speakingRms + 1e-7);
      return saveCalibration({
        noiseFloorRms,
        speakingRms,
        speakingDb: Math.round(speakingDb * 10) / 10,
        date: new Date().toISOString(),
      });
    } finally {
      ctx.close().catch(() => {});
    }
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
