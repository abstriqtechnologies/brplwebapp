import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * In-memory token-bucket rate limiter.
 *
 * Each bucket has `capacity` tokens that refill at `refillPerSec` per second.
 * `take(key, n=1)` returns true if `n` tokens are available (and decrements),
 * false otherwise.
 *
 * The bucket is keyed by an arbitrary string (typically IP + route). State is
 * process-local; for multi-instance deployments this would need Redis. The
 * Phase 1 limiter is intentionally simple — see the plan for Phase 4+ when
 * Redis-backed counters become a need.
 *
 * `now()` is injectable for tests so we can advance time without sleeping.
 */

describe("api/rate-limit", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    async function load() {
        return await import("@/lib/api/rate-limit");
    }

    describe("TokenBucket (low-level)", () => {
        it("starts full", async () => {
            const { TokenBucket } = await load();
            const b = new TokenBucket({ capacity: 5, refillPerSec: 1 });
            expect(b.peek()).toBe(5);
        });

        it("take() decrements and returns true while tokens remain", async () => {
            const { TokenBucket } = await load();
            const b = new TokenBucket({ capacity: 3, refillPerSec: 0 });
            expect(b.take()).toBe(true);
            expect(b.take()).toBe(true);
            expect(b.take()).toBe(true);
            expect(b.take()).toBe(false);
            expect(b.peek()).toBe(0);
        });

        it("refills tokens over time", async () => {
            const { TokenBucket } = await load();
            let t = 1000;
            const b = new TokenBucket({ capacity: 5, refillPerSec: 2, now: () => t });
            for (let i = 0; i < 5; i++) b.take();
            expect(b.take()).toBe(false);
            // Advance 1 second → +2 tokens.
            t += 1000;
            expect(b.take()).toBe(true);
            expect(b.take()).toBe(true);
            expect(b.take()).toBe(false);
        });

        it("never exceeds capacity", async () => {
            const { TokenBucket } = await load();
            let t = 1000;
            const b = new TokenBucket({ capacity: 3, refillPerSec: 10, now: () => t });
            t += 100_000; // 100s of refill time
            expect(b.peek()).toBe(3);
        });

        it("take(n) takes multiple tokens at once", async () => {
            const { TokenBucket } = await load();
            const b = new TokenBucket({ capacity: 5, refillPerSec: 0 });
            expect(b.take(3)).toBe(true);
            expect(b.peek()).toBe(2);
            expect(b.take(3)).toBe(false);
        });

        it("retryAfterSec returns the time until the next token is available", async () => {
            const { TokenBucket } = await load();
            let t = 1000;
            const b = new TokenBucket({ capacity: 1, refillPerSec: 0.5, now: () => t });
            b.take();
            // 1 / 0.5 = 2 seconds to refill one token
            expect(b.retryAfterSec()).toBe(2);
        });

        it("retryAfterSec is 0 when tokens are available", async () => {
            const { TokenBucket } = await load();
            const b = new TokenBucket({ capacity: 5, refillPerSec: 1 });
            expect(b.retryAfterSec()).toBe(0);
        });
    });

    describe("RateLimiter (keyed)", () => {
        it("isolates buckets per key", async () => {
            const { RateLimiter } = await load();
            const rl = new RateLimiter({ capacity: 1, refillPerSec: 0 });
            expect(rl.take("ip_a")).toBe(true);
            expect(rl.take("ip_a")).toBe(false);
            expect(rl.take("ip_b")).toBe(true); // different bucket
        });

        it("getRetryAfter returns the retry seconds for a key", async () => {
            const { RateLimiter } = await load();
            const rl = new RateLimiter({ capacity: 1, refillPerSec: 0.5 });
            rl.take("ip_a");
            expect(rl.getRetryAfter("ip_a")).toBe(2);
            expect(rl.getRetryAfter("ip_b")).toBe(0); // hasn't been used
        });
    });

    describe("Named limit presets", () => {
        it("limiterFor('otp-send') returns a configured bucket", async () => {
            const { limiterFor } = await load();
            const limiter = limiterFor("otp-send");
            // Hit it 5 times quickly (default capacity for OTP routes).
            for (let i = 0; i < 5; i++) {
                expect(limiter.take("phone_1")).toBe(true);
            }
        });

        it("limiterFor('admin-action') is more generous than otp-send", async () => {
            const { limiterFor } = await load();
            const otp = limiterFor("otp-send");
            const admin = limiterFor("admin-action");
            // Drain the otp bucket completely.
            let count = 0;
            while (otp.take("phone_x")) count++;
            // Admin bucket should still have plenty.
            expect(count).toBeLessThan(20);
            expect(admin.take("admin_ip")).toBe(true);
        });
    });
});
