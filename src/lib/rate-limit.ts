type Bucket = {
  count: number;
  resetAt: number;
};

const globalRateLimitStore =
  (
    globalThis as typeof globalThis & {
      __kashaRateLimitStore?: Map<string, Bucket>;
    }
  ).__kashaRateLimitStore || new Map<string, Bucket>();

(
  globalThis as typeof globalThis & {
    __kashaRateLimitStore?: Map<string, Bucket>;
  }
).__kashaRateLimitStore = globalRateLimitStore;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = input.now ?? Date.now();
  const current = globalRateLimitStore.get(input.key);

  if (!current || current.resetAt <= now) {
    globalRateLimitStore.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
    };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  globalRateLimitStore.set(input.key, current);

  return {
    allowed: true,
    remaining: Math.max(0, input.limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}
