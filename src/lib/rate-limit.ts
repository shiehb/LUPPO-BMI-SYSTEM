interface Entry {
  count:   number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export interface RateLimitOptions {
  /** Max requests allowed in the window. */
  limit:    number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/**
 * Returns true if the request is allowed, false if rate-limited.
 * Uses an in-process store — effective per serverless instance.
 */
export function rateLimit(key: string, opts: RateLimitOptions): boolean {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }

  if (entry.count >= opts.limit) return false;

  entry.count++;
  return true;
}
