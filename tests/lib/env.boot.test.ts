import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Production boot-readiness check.
 *
 * `assertProductionBootReadiness()` throws if any production-required env
 * var is missing. In dev/test it's a no-op.
 */

describe("env boot check", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    async function load() {
        return await import("@/lib/env");
    }

    function resetEnv() {
        for (const k of Object.keys(process.env)) delete (process.env as Record<string, string>)[k];
    }

    it("is a no-op when not in production", async () => {
        resetEnv();
        process.env.NODE_ENV = "development";
        const env = await load();
        expect(() => env.assertProductionBootReadiness()).not.toThrow();
    });

    it("throws in production when JWT_SECRET is missing", async () => {
        resetEnv();
        process.env.NODE_ENV = "production";
        process.env.MONGODB_URI = "mongodb://x";
        process.env.JWT_SECRET = "dev-placeholder-XXX";
        const env = await load();
        expect(() => env.assertProductionBootReadiness()).toThrow(/JWT_SECRET/);
    });

    it("throws in production when RAZORPAY_WEBHOOK_SECRET is missing", async () => {
        resetEnv();
        process.env.NODE_ENV = "production";
        process.env.MONGODB_URI = "mongodb://x";
        process.env.JWT_SECRET = "real-secret-12345678";
        process.env.RAZORPAY_KEY_ID = "rzp_test_x";
        process.env.RAZORPAY_KEY_SECRET = "secret";
        // RAZORPAY_WEBHOOK_SECRET is NOT set
        const env = await load();
        expect(() => env.assertProductionBootReadiness()).toThrow(/RAZORPAY_WEBHOOK_SECRET/);
    });

    it("passes in production when all required secrets are set", async () => {
        resetEnv();
        process.env.NODE_ENV = "production";
        process.env.MONGODB_URI = "mongodb://x";
        process.env.JWT_SECRET = "real-secret-12345678";
        process.env.RAZORPAY_KEY_ID = "rzp_test_x";
        process.env.RAZORPAY_KEY_SECRET = "secret";
        process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_secret";
        const env = await load();
        expect(() => env.assertProductionBootReadiness()).not.toThrow();
    });

    it("aggregates all missing secrets into a single error", async () => {
        resetEnv();
        process.env.NODE_ENV = "production";
        process.env.MONGODB_URI = "mongodb://x";
        process.env.JWT_SECRET = "real-secret-12345678";
        // RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET all missing
        const env = await load();
        try {
            env.assertProductionBootReadiness();
            expect.fail("expected throw");
        } catch (e: any) {
            expect(e.message).toContain("RAZORPAY_KEY_ID");
            expect(e.message).toContain("RAZORPAY_KEY_SECRET");
            expect(e.message).toContain("RAZORPAY_WEBHOOK_SECRET");
        }
    });
});
