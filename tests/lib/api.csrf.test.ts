import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * CSRF double-submit-cookie implementation.
 *
 * Flow:
 *   1. On login, server sets a non-httpOnly cookie `brpl_csrf` with a random token.
 *   2. Client reads the cookie (document.cookie) and echoes it in the
 *      `X-CSRF-Token` header on every mutating request.
 *   3. Server compares cookie value === header value. Mismatch → 403.
 *
 * Why non-httpOnly? So client JS can read it. This is safe because:
 *   - An attacker on a different origin can't read this site's cookies.
 *   - We don't trust the cookie value alone — it's compared against the header.
 */

describe("api/csrf", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
        // Default to CSRF enabled for tests; individual tests opt out.
        process.env.BRPL_CSRF_REQUIRED = "true";
        vi.doMock("server-only", () => ({}));
    });

    async function load() {
        return await import("@/lib/api/csrf");
    }

    function makeStore(initial: Record<string, string> = {}) {
        const jar = new Map(Object.entries(initial));
        return {
            get: (name: string) => {
                const v = jar.get(name);
                return v ? { name, value: v } : undefined;
            },
            set: (name: string, value: string, opts?: any) => {
                jar.set(name, value);
            },
            delete: (name: string) => {
                jar.delete(name);
            },
            _jar: jar,
        };
    }

    async function loadWithStore(store: ReturnType<typeof makeStore>) {
        vi.doMock("next/headers", () => ({ cookies: async () => store }));
        return await load();
    }

    describe("issueCsrfCookie", () => {
        it("writes a non-httpOnly brpl_csrf cookie", async () => {
            const store = makeStore();
            const csrf = await loadWithStore(store);
            const token = await csrf.issueCsrfCookie();
            expect(token.length).toBeGreaterThan(10);
            expect(store._jar.get("brpl_csrf")).toBe(token);
        });

        it("token is sufficiently random (two issues produce different values)", async () => {
            const store = makeStore();
            const csrf = await loadWithStore(store);
            const a = await csrf.issueCsrfCookie();
            const b = await csrf.issueCsrfCookie();
            expect(a).not.toBe(b);
        });
    });

    describe("assertCsrf", () => {
        it("passes when the header matches the cookie", async () => {
            const store = makeStore({ brpl_csrf: "token-abc" });
            const csrf = await loadWithStore(store);
            // Must not throw.
            await csrf.assertCsrf(new Request("http://x", { headers: { "x-csrf-token": "token-abc" } }));
        });

        it("throws ForbiddenError when no cookie is set", async () => {
            const store = makeStore();
            const csrf = await loadWithStore(store);
            await expect(
                csrf.assertCsrf(new Request("http://x", { headers: { "x-csrf-token": "token-abc" } })),
            ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
        });

        it("throws ForbiddenError when header is missing", async () => {
            const store = makeStore({ brpl_csrf: "token-abc" });
            const csrf = await loadWithStore(store);
            await expect(csrf.assertCsrf(new Request("http://x"))).rejects.toMatchObject({
                code: "FORBIDDEN",
                status: 403,
            });
        });

        it("throws ForbiddenError when header doesn't match cookie", async () => {
            const store = makeStore({ brpl_csrf: "token-abc" });
            const csrf = await loadWithStore(store);
            await expect(
                csrf.assertCsrf(new Request("http://x", { headers: { "x-csrf-token": "different" } })),
            ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
        });

        it("uses constant-time comparison to prevent timing attacks", async () => {
            // We can't directly observe timing, but we can at least assert
            // the comparison happens against exact bytes. Two tokens that
            // happen to share a prefix should still fail.
            const store = makeStore({ brpl_csrf: "abcdef1234567890" });
            const csrf = await loadWithStore(store);
            await expect(
                csrf.assertCsrf(new Request("http://x", { headers: { "x-csrf-token": "abcdef" } })),
            ).rejects.toMatchObject({ code: "FORBIDDEN" });
        });

        it("skips the check when BRPL_CSRF_REQUIRED is not set", async () => {
            vi.resetModules();
            process.env.BRPL_CSRF_REQUIRED = "";
            // No cookie, no header — must not throw.
            const store = makeStore();
            const csrf = await loadWithStore(store);
            await csrf.assertCsrf(new Request("http://x"));
        });

        it("enforces when BRPL_CSRF_REQUIRED is 'true' (covered by the other tests in this block)", async () => {
            // The other tests in this describe already run with BRPL_CSRF_REQUIRED=true,
            // so this is just an explicit sanity check.
            const store = makeStore();
            const csrf = await loadWithStore(store);
            await expect(csrf.assertCsrf(new Request("http://x"))).rejects.toMatchObject({
                code: "FORBIDDEN",
            });
        });
    });

    describe("clearCsrfCookie", () => {
        it("removes the csrf cookie", async () => {
            const store = makeStore({ brpl_csrf: "x" });
            const csrf = await loadWithStore(store);
            await csrf.clearCsrfCookie();
            expect(store._jar.has("brpl_csrf")).toBe(false);
        });
    });
});
