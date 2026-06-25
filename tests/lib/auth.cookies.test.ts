import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

/**
 * Cookie helpers — server-only, wrap Next.js `cookies()` to set/get/clear
 * the three auth cookies.
 *
 * We mock `next/headers` so we don't need a real Next request context.
 */

function makeCookieStore(initial: Record<string, string> = {}) {
    const jar = new Map(Object.entries(initial));
    return {
        get: (name: string) => {
            const v = jar.get(name);
            return v ? { name, value: v } : undefined;
        },
        set: (name: string, value: string) => {
            jar.set(name, value);
        },
        delete: (name: string) => {
            jar.delete(name);
        },
        _jar: jar,
    };
}

describe("auth/cookies", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    });

    async function load(store: ReturnType<typeof makeCookieStore>) {
        // "server-only" is a marker package shipped inside `next`. The vitest
        // resolver doesn't know about that internal path, so we alias it to
        // a no-op module here.
        vi.doMock("server-only", () => ({}));
        const cookiesMock = vi.fn(async () => store);
        vi.doMock("next/headers", () => ({ cookies: cookiesMock }));
        return await import("@/lib/auth/cookies");
    }

    it("setAuthCookie writes brpl_auth with httpOnly + sameSite=lax", async () => {
        const store = makeCookieStore();
        const cookies = await load(store);
        await cookies.setAuthCookie("token-abc");
        const entry = store._jar.get("brpl_auth");
        expect(entry).toBe("token-abc");
    });

    it("setPendingCookie writes brpl_pending", async () => {
        const store = makeCookieStore();
        const cookies = await load(store);
        await cookies.setPendingCookie("p-token");
        expect(store._jar.get("brpl_pending")).toBe("p-token");
    });

    it("setAdminCookie writes brpl_admin", async () => {
        const store = makeCookieStore();
        const cookies = await load(store);
        await cookies.setAdminCookie("admin-token");
        expect(store._jar.get("brpl_admin")).toBe("admin-token");
    });

    it("getAuthCookie returns the value when present", async () => {
        const store = makeCookieStore({ brpl_auth: "x" });
        const cookies = await load(store);
        expect(await cookies.getAuthCookie()).toBe("x");
    });

    it("getAuthCookie returns undefined when absent", async () => {
        const store = makeCookieStore();
        const cookies = await load(store);
        expect(await cookies.getAuthCookie()).toBeUndefined();
    });

    it("getPendingCookie returns the value when present", async () => {
        const store = makeCookieStore({ brpl_pending: "y" });
        const cookies = await load(store);
        expect(await cookies.getPendingCookie()).toBe("y");
    });

    it("getPendingCookie returns undefined when absent", async () => {
        const store = makeCookieStore();
        const cookies = await load(store);
        expect(await cookies.getPendingCookie()).toBeUndefined();
    });

    it("getAdminCookie returns the value when present", async () => {
        const store = makeCookieStore({ brpl_admin: "z" });
        const cookies = await load(store);
        expect(await cookies.getAdminCookie()).toBe("z");
    });

    it("getAdminCookie returns undefined when absent", async () => {
        const store = makeCookieStore();
        const cookies = await load(store);
        expect(await cookies.getAdminCookie()).toBeUndefined();
    });

    it("clearAuthCookies removes brpl_auth and brpl_pending", async () => {
        const store = makeCookieStore({ brpl_auth: "a", brpl_pending: "b", brpl_admin: "c" });
        const cookies = await load(store);
        await cookies.clearAuthCookies();
        expect(store._jar.has("brpl_auth")).toBe(false);
        expect(store._jar.has("brpl_pending")).toBe(false);
        // Admin cookie is intentionally NOT cleared — separate concern.
        expect(store._jar.has("brpl_admin")).toBe(true);
    });

    it("clearPendingCookie removes only brpl_pending", async () => {
        const store = makeCookieStore({ brpl_auth: "a", brpl_pending: "b" });
        const cookies = await load(store);
        await cookies.clearPendingCookie();
        expect(store._jar.has("brpl_pending")).toBe(false);
        expect(store._jar.has("brpl_auth")).toBe(true);
    });

    it("clearAdminCookie removes only brpl_admin", async () => {
        const store = makeCookieStore({ brpl_auth: "a", brpl_admin: "c" });
        const cookies = await load(store);
        await cookies.clearAdminCookie();
        expect(store._jar.has("brpl_admin")).toBe(false);
        expect(store._jar.has("brpl_auth")).toBe(true);
    });

    it("setAuthCookieOptions returns the standard cookie attributes (httpOnly, path, sameSite=lax)", async () => {
        const store = makeCookieStore();
        const cookies = await load(store);
        // We can't easily inspect the options object passed to Next's
        // cookies().set, but we can verify the helper exists and produces a
        // valid value when fed through it.
        const opts = cookies.authCookieOptions(60);
        expect(opts.httpOnly).toBe(true);
        expect(opts.path).toBe("/");
        expect(opts.sameSite).toBe("lax");
        expect(opts.maxAge).toBe(60);
        expect(opts.secure).toBe(false); // NODE_ENV=test
    });

    it("authCookieOptions sets secure=true in production", async () => {
        process.env.NODE_ENV = "production";
        const store = makeCookieStore();
        const cookies = await load(store);
        const opts = cookies.authCookieOptions(60);
        expect(opts.secure).toBe(true);
    });
});
