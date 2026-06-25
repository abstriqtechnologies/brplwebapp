import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Auth session helpers.
 *
 * `getAuthSession(lookup)`  — verify the auth JWT AND look the user up in the
 *                             DB. Returns null if either step fails.
 * `getAdminSession(lookup)` — verify the admin JWT AND look the admin up.
 *
 * The lookup function is dependency-injected so the unit test can supply a
 * pure in-memory implementation instead of hitting Mongo.
 */

describe("auth/session", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
        vi.doMock("server-only", () => ({}));
    });

    async function load() {
        const { verifyAuth, signAuth, signAdmin, signPending, verifyAdmin } = await import("@/lib/auth/crypto");
        const session = await import("@/lib/auth/session");
        return { verifyAuth, signAuth, signAdmin, signPending, verifyAdmin, session };
    }

    type User = { _id: string; phone: string };
    type Admin = { _id: string; email: string; role: string; active: boolean };

    describe("getAuthSession", () => {
        it("returns null when no token cookie is present", async () => {
            const { session } = await load();
            const result = await session.getAuthSession({
                getAuthCookie: async () => undefined,
                lookup: async () => ({ _id: "u1", phone: "1" }),
            });
            expect(result).toBeNull();
        });

        it("returns null when the JWT is invalid (wrong purpose)", async () => {
            const { session, signPending } = await load();
            const token = await signPending({ sub: "phone:1", phone: "1" });
            const result = await session.getAuthSession({
                getAuthCookie: async () => token,
                lookup: async () => ({ _id: "u1", phone: "1" }),
            });
            expect(result).toBeNull();
        });

        it("returns null when the JWT is valid but the user is not found in the DB", async () => {
            const { session, signAuth } = await load();
            const token = await signAuth({ sub: "user_missing", phone: "1" });
            const result = await session.getAuthSession({
                getAuthCookie: async () => token,
                lookup: async () => null,
            });
            expect(result).toBeNull();
        });

        it("returns the session when token + lookup both succeed", async () => {
            const { session, signAuth } = await load();
            const token = await signAuth({ sub: "user_42", phone: "9876543210" });
            const user: User = { _id: "user_42", phone: "9876543210" };
            const result = await session.getAuthSession({
                getAuthCookie: async () => token,
                lookup: async (id) => (id === "user_42" ? user : null),
            });
            expect(result).not.toBeNull();
            expect(result!.session.sub).toBe("user_42");
            expect(result!.session.phone).toBe("9876543210");
            expect(result!.session.purpose).toBe("auth");
            expect(result!.user).toEqual(user);
        });

        it("returns null if the lookup throws (defensive)", async () => {
            const { session, signAuth } = await load();
            const token = await signAuth({ sub: "user_1", phone: "1" });
            const result = await session.getAuthSession({
                getAuthCookie: async () => token,
                lookup: async () => {
                    throw new Error("db down");
                },
            });
            expect(result).toBeNull();
        });
    });

    describe("getAdminSession", () => {
        it("returns null when no token cookie is present", async () => {
            const { session } = await load();
            const result = await session.getAdminSession({
                getAdminCookie: async () => undefined,
                lookup: async () => ({ _id: "a1", email: "a@a", role: "superadmin", active: true }),
            });
            expect(result).toBeNull();
        });

        it("returns null when the admin is found but inactive", async () => {
            const { session, signAdmin } = await load();
            const token = await signAdmin({ sub: "admin_1", email: "a@a", role: "superadmin" });
            const result = await session.getAdminSession({
                getAdminCookie: async () => token,
                lookup: async () => ({ _id: "admin_1", email: "a@a", role: "superadmin", active: false }),
            });
            expect(result).toBeNull();
        });

        it("returns the session when token + lookup + active all succeed", async () => {
            const { session, signAdmin } = await load();
            const token = await signAdmin({
                sub: "admin_1",
                email: "admin@brpl.com",
                role: "superadmin",
                name: "Test",
            });
            const admin: Admin = { _id: "admin_1", email: "admin@brpl.com", role: "superadmin", active: true };
            const result = await session.getAdminSession({
                getAdminCookie: async () => token,
                lookup: async () => admin,
            });
            expect(result).not.toBeNull();
            expect(result!.session.sub).toBe("admin_1");
            expect(result!.session.email).toBe("admin@brpl.com");
            expect(result!.session.role).toBe("superadmin");
            expect(result!.session.name).toBe("Test");
            expect(result!.session.purpose).toBe("admin");
            expect(result!.admin).toEqual(admin);
        });

        it("returns null if the lookup throws", async () => {
            const { session, signAdmin } = await load();
            const token = await signAdmin({ sub: "admin_1", email: "a@a", role: "superadmin" });
            const result = await session.getAdminSession({
                getAdminCookie: async () => token,
                lookup: async () => {
                    throw new Error("db down");
                },
            });
            expect(result).toBeNull();
        });

        it("returns null when the JWT is for an auth (user) cookie", async () => {
            const { session, signAuth } = await load();
            const token = await signAuth({ sub: "u", phone: "1" });
            const result = await session.getAdminSession({
                getAdminCookie: async () => token,
                lookup: async () => ({ _id: "a1", email: "a@a", role: "superadmin", active: true }),
            });
            expect(result).toBeNull();
        });
    });
});
