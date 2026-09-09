/**
 * Test scaffolding.
 *
 * The app's storage modules feature-detect `window` and degrade to no-ops on
 * the server, so tests install a minimal in-memory `window.localStorage` before
 * importing anything that touches it. Nothing here mocks app code — the real
 * modules run against a real (if tiny) storage implementation.
 */

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  // Mirrors the real Storage interface's enumeration API — code under test
  // (the "reset all progress" prefix sweep) walks localStorage this way.
  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

/** Install a fresh `window.localStorage`. Call in beforeEach for isolation. */
export function installStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  (globalThis as any).window = { localStorage: storage };
  return storage;
}

export function removeStorage(): void {
  delete (globalThis as any).window;
}

import type { AudioMetrics } from '@/lib/audio-dsp';

/**
 * A plausible set of audio metrics for a ~30s take, overridable per test.
 * Defaults sit inside every "good" band so a test can move one number and
 * attribute the score change to that number alone.
 */
export function audioMetrics(overrides: Partial<AudioMetrics> = {}): AudioMetrics {
  return {
    durationSec: 30,
    speakingSec: 26,
    silenceSec: 4,
    pauseCount: 6,
    longPauseCount: 0,
    avgPauseSec: 0.6,
    pausesPerMin: 12,
    syllableCount: 90,
    syllablesPerSec: 3.5,
    estimatedWpm: 145,
    wpm: 145,
    articulationWpm: 165,
    filledPauseCount: 0,
    filledPausePerMin: 0,
    energy: { meanDb: -22, dynamicRangeDb: 12 },
    pitch: { medianHz: 140, variationSemitones: 4, rangeSemitones: 9, voicedRatio: 0.6 },
    events: [],
    ...overrides,
  };
}
