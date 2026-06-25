import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Auth crypto helpers: pure, side-effect-free wrappers around `jose`.
 *
 * Each helper:
 *   - signAuth / signPending / signAdmin — issue a JWT with the right `purpose`
 *   - verifyAuth / verifyPending / verifyAdmin — parse + verify + check purpose
 *   - Returns null on any failure (expired / wrong-purpose / bad-sig).
 *
 * We deliberately do NOT mock `jose` — we want to prove the integration works.
 */

describe("auth/crypto", () => {
    beforeEach(() => {
        vi.resetModules();
        // Provide a deterministic, valid JWT secret for the test process.
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    });

    async function load() {
        return await import("@/lib/auth/crypto");
    }

    describe("signAuth / verifyAuth", () => {
        it("signs a token with purpose=auth and round-trips", async () => {
            const { signAuth, verifyAuth } = await load();
            const token = await signAuth({ sub: "user_123", phone: "9876543210" });
            expect(typeof token).toBe("string");
            expect(token.split(".").length).toBe(3); // JWT shape
            const decoded = await verifyAuth(token);
            expect(decoded).not.toBeNull();
            expect(decoded?.sub).toBe("user_123");
            expect(decoded?.phone).toBe("9876543210");
            expect(decoded?.purpose).toBe("auth");
        });

        it("verifyAuth returns null when purpose is not auth", async () => {
            const { signPending, verifyAuth } = await load();
            const token = await signPending({ sub: "pending", phone: "9876543210" });
            expect(await verifyAuth(token)).toBeNull();
        });

        it("verifyAuth returns null for an expired token", async () => {
            const { signAuth, verifyAuth } = await load();
            // Sign with a negative TTL — expires immediately.
            const token = await signAuth({ sub: "user_x", phone: "1" }, "-1s");
            expect(await verifyAuth(token)).toBeNull();
        });

        it("verifyAuth returns null for a tampered token", async () => {
            const { signAuth, verifyAuth } = await load();
            const token = await signAuth({ sub: "u", phone: "1" });
            const tampered = token.slice(0, -4) + "AAAA";
            expect(await verifyAuth(tampered)).toBeNull();
        });

        it("verifyAuth returns null for garbage input", async () => {
            const { verifyAuth } = await load();
            expect(await verifyAuth("not-a-jwt")).toBeNull();
            expect(await verifyAuth("")).toBeNull();
            expect(await verifyAuth("a.b.c")).toBeNull();
        });
    });

    describe("signPending / verifyPending", () => {
        it("signs with purpose=pending_reg", async () => {
            const { signPending, verifyPending } = await load();
            const token = await signPending({ sub: "phone:9876543210", phone: "9876543210" });
            const decoded = await verifyPending(token);
            expect(decoded?.purpose).toBe("pending_reg");
            expect(decoded?.phone).toBe("9876543210");
        });

        it("verifyPending rejects auth-purposed tokens", async () => {
            const { signAuth, verifyPending } = await load();
            const token = await signAuth({ sub: "x", phone: "1" });
            expect(await verifyPending(token)).toBeNull();
        });
    });

    describe("signAdmin / verifyAdmin", () => {
        it("signs with purpose=admin", async () => {
            const { signAdmin, verifyAdmin } = await load();
            const token = await signAdmin({
                sub: "admin_1",
                email: "admin@brpl.com",
                role: "superadmin",
                name: "Test Admin",
            });
            const decoded = await verifyAdmin(token);
            expect(decoded?.purpose).toBe("admin");
            expect(decoded?.email).toBe("admin@brpl.com");
            expect(decoded?.role).toBe("superadmin");
        });

        it("verifyAdmin rejects non-admin tokens", async () => {
            const { signAuth, verifyAdmin } = await load();
            const token = await signAuth({ sub: "u", phone: "1" });
            expect(await verifyAdmin(token)).toBeNull();
        });
    });

    describe("with a different secret", () => {
        it("verifyAuth returns null when secrets differ between modules", async () => {
            const { signAuth } = await load();
            const token = await signAuth({ sub: "u", phone: "1" });
            // Re-import with a different secret.
            vi.resetModules();
            process.env.JWT_SECRET = "a-completely-different-secret-of-32-chars";
            const { verifyAuth } = await load();
            expect(await verifyAuth(token)).toBeNull();
        });
    });
});
