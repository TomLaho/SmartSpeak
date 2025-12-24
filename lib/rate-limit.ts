type Bucket = { count: number; reset: number };

const buckets: Record<string, Bucket> = {};
const WINDOW_MS = 60_000;
const LIMIT = 5;

export function rateLimit(key: string) {
  const now = Date.now();
  const bucket = buckets[key];
  if (!bucket || bucket.reset < now) {
    buckets[key] = { count: 1, reset: now + WINDOW_MS };
    return { success: true, remaining: LIMIT - 1, reset: buckets[key].reset };
  }

  if (bucket.count >= LIMIT) {
    return { success: false, remaining: 0, reset: bucket.reset };
  }

  bucket.count += 1;
  return { success: true, remaining: LIMIT - bucket.count, reset: bucket.reset };
}
