/**
 * In-memory token-bucket rate limiter.
 *
 * Each bucket has `capacity` tokens that refill at `refillPerSec` per second.
 * `take(key, n=1)` returns true if `n` tokens are available (and decrements),
 * false otherwise. The bucket is keyed by an arbitrary string (typically
 * `IP:route`).
 *
 * **Process-local.** For multi-instance deployments this would need a
 * shared store (Redis). The Phase 1 limiter is intentionally simple — see
 * the refactor plan for when to add Redis-backed counters.
 *
 * Time is injectable via the `now` option for tests.
 */

export type BucketOptions = {
    capacity: number;
    refillPerSec: number;
    now?: () => number;
};

const realNow = (): number => Date.now();

export class TokenBucket {
    private capacity: number;
    private refillPerSec: number;
    private now: () => number;
    private tokens: number;
    private lastRefillAt: number;

    constructor(opts: BucketOptions) {
        this.capacity = opts.capacity;
        this.refillPerSec = opts.refillPerSec;
        this.now = opts.now ?? realNow;
        this.tokens = opts.capacity;
        this.lastRefillAt = this.now();
    }

    /** Current number of tokens (after refill). */
    peek(): number {
        this.refill();
        return this.tokens;
    }

    /**
     * Try to take `n` tokens. Returns true on success (and decrements), false
     * if not enough tokens are available (and does not decrement).
     */
    take(n = 1): boolean {
        this.refill();
        if (this.tokens >= n) {
            this.tokens -= n;
            return true;
        }
        return false;
    }

    /** Seconds until at least one token is available. 0 if available now. */
    retryAfterSec(): number {
        this.refill();
        if (this.tokens >= 1) return 0;
        if (this.refillPerSec <= 0) return Infinity;
        const deficit = 1 - this.tokens;
        return Math.ceil(deficit / this.refillPerSec);
    }

    private refill(): void {
        if (this.refillPerSec <= 0) {
            this.lastRefillAt = this.now();
            return;
        }
        const now = this.now();
        const elapsedSec = Math.max(0, (now - this.lastRefillAt) / 1000);
        if (elapsedSec === 0) return;
        const refilled = elapsedSec * this.refillPerSec;
        this.tokens = Math.min(this.capacity, this.tokens + refilled);
        this.lastRefillAt = now;
    }
}

/**
 * Keyed collection of TokenBuckets. One bucket per unique key.
 */
export class RateLimiter {
    private options: BucketOptions;
    private buckets = new Map<string, TokenBucket>();

    constructor(options: BucketOptions) {
        this.options = options;
    }

    take(key: string, n = 1): boolean {
        let b = this.buckets.get(key);
        if (!b) {
            b = new TokenBucket(this.options);
            this.buckets.set(key, b);
        }
        return b.take(n);
    }

    getRetryAfter(key: string): number {
        const b = this.buckets.get(key);
        if (!b) return 0;
        return b.retryAfterSec();
    }

    /** Test helper — clear all bucket state. */
    reset(): void {
        this.buckets.clear();
    }
}

// ---------- Named presets ----------
//
// These are the buckets used by route handlers. Centralised here so the
// limits are easy to find and tune. The bucket name is what the route
// handler passes to `limiterFor(name)`.

export type LimitName =
    | "otp-send" // POST /api/auth/send-otp
    | "otp-verify" // POST /api/auth/verify-otp
    | "admin-login" // POST /api/admin/auth/login
    | "admin-action" // any other admin POST/PATCH/DELETE
    | "public-write"; // POST /api/contact, partner forms

const PRESETS: Record<LimitName, BucketOptions> = {
    "otp-send": { capacity: 5, refillPerSec: 5 / 600 }, // 5 per 10 min
    "otp-verify": { capacity: 10, refillPerSec: 10 / 600 }, // 10 per 10 min
    "admin-login": { capacity: 5, refillPerSec: 5 / 300 }, // 5 per 5 min
    "admin-action": { capacity: 60, refillPerSec: 1 }, // 60 per min
    "public-write": { capacity: 10, refillPerSec: 10 / 60 }, // 10 per min
};

const limiters = new Map<LimitName, RateLimiter>();

/**
 * Get (or lazily create) the shared RateLimiter for a given named bucket.
 * Each name maps to a single process-wide limiter with its own per-key buckets.
 */
export function limiterFor(name: LimitName): RateLimiter {
    let l = limiters.get(name);
    if (!l) {
        l = new RateLimiter(PRESETS[name]);
        limiters.set(name, l);
    }
    return l;
}

/** Test helper — reset all named limiters. */
export function _resetAllLimiters(): void {
    limiters.clear();
}
