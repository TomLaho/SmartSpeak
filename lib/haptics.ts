/**
 * Feature-detected vibration wrapper.
 * Safe in SSR (no-op when window/navigator unavailable or vibrate unsupported).
 */

const PATTERNS = {
  tap: [10],
  success: [12, 40, 12],
  celebrate: [10, 30, 10, 30, 24],
} as const;

export function canVibrate(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

export function haptic(pattern: keyof typeof PATTERNS = 'tap'): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Ignore — vibration is a best-effort enhancement.
  }
}
