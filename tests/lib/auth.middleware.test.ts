import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Route-handler auth guards.
 *
 * These are the "throw typed errors, never return NextResponse" primitives.
 * `withRequest()` (Phase 1.7) catches them and converts to JSON.
 *
 * - requireAuth    → AuthSession (user logged in)
 * - requireAdmin   → AdminSession (admin logged in + active)
 * - requirePending → PendingSession (phone verified, registration incomplete)
 *
 * Each takes an injected lookup so tests don't need a real DB.
 */

describe("auth/middleware", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
        vi.doMock("server-only", () => ({}));
    });

    async function load() {
        const { signAuth, signAdmin, signPending } = await import("@/lib/auth/crypto");
        const mw = await import("@/lib/auth/middleware");
        return { signAuth, signAdmin, signPending, mw };
    }

    describe("requireAuth", () => {
        it("returns the session when valid", async () => {
            const { signAuth, mw } = await load();
            const token = await signAuth({ sub: "user_42", phone: "9876543210" });
            const user = { _id: "user_42", phone: "9876543210" };
            const result = await mw.requireAuth({
                getAuthCookie: async () => token,
                lookup: async () => user,
            });
            expect(result.session.sub).toBe("user_42");
            expect(result.user).toEqual(user);
        });

        it("throws UnauthorizedError when no cookie", async () => {
            const { mw } = await load();
            await expect(
                mw.requireAuth({
                    getAuthCookie: async () => undefined,
                    lookup: async () => ({ _id: "u", phone: "1" }),
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });

        it("throws UnauthorizedError when JWT is invalid", async () => {
            const { mw } = await load();
            await expect(
                mw.requireAuth({
                    getAuthCookie: async () => "garbage",
                    lookup: async () => null,
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });

        it("throws UnauthorizedError when user is not in DB", async () => {
            const { signAuth, mw } = await load();
            const token = await signAuth({ sub: "missing", phone: "1" });
            await expect(
                mw.requireAuth({
                    getAuthCookie: async () => token,
                    lookup: async () => null,
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });
    });

    describe("requireAdmin", () => {
        it("returns the session when valid superadmin", async () => {
            const { signAdmin, mw } = await load();
            const token = await signAdmin({ sub: "a1", email: "a@a", role: "superadmin" });
            const admin = { _id: "a1", email: "a@a", role: "superadmin", active: true };
            const result = await mw.requireAdmin({
                getAdminCookie: async () => token,
                lookup: async () => admin,
            });
            expect(result.session.role).toBe("superadmin");
            expect(result.admin).toEqual(admin);
        });

        it("throws UnauthorizedError when not logged in", async () => {
            const { mw } = await load();
            await expect(
                mw.requireAdmin({
                    getAdminCookie: async () => undefined,
                    lookup: async () => ({ _id: "a", email: "a", role: "superadmin", active: true }),
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });

        it("throws UnauthorizedError when admin is inactive", async () => {
            const { signAdmin, mw } = await load();
            const token = await signAdmin({ sub: "a1", email: "a@a", role: "subadmin" });
            await expect(
                mw.requireAdmin({
                    getAdminCookie: async () => token,
                    lookup: async () => ({ _id: "a1", email: "a@a", role: "subadmin", active: false }),
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });

        it("throws ForbiddenError when role is not in the allowed list", async () => {
            const { signAdmin, mw } = await load();
            const token = await signAdmin({ sub: "a1", email: "a@a", role: "seo_content" });
            await expect(
                mw.requireAdmin({
                    getAdminCookie: async () => token,
                    lookup: async () => ({ _id: "a1", email: "a@a", role: "seo_content", active: true }),
                    allowedRoles: ["superadmin", "subadmin"],
                }),
            ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
        });

        it("passes when role is in the allowed list (including via hierarchy)", async () => {
            const { signAdmin, mw } = await load();
            const token = await signAdmin({ sub: "a1", email: "a@a", role: "superadmin" });
            const admin = { _id: "a1", email: "a@a", role: "superadmin", active: true };
            const result = await mw.requireAdmin({
                getAdminCookie: async () => token,
                lookup: async () => admin,
                allowedRoles: ["seo_content"], // superadmin ≥ seo_content — passes
            });
            expect(result.session.role).toBe("superadmin");
        });

        it("skips role check when allowedRoles is not provided", async () => {
            const { signAdmin, mw } = await load();
            const token = await signAdmin({ sub: "a1", email: "a@a", role: "seo_content" });
            const admin = { _id: "a1", email: "a@a", role: "seo_content", active: true };
            const result = await mw.requireAdmin({
                getAdminCookie: async () => token,
                lookup: async () => admin,
            });
            expect(result.session.role).toBe("seo_content");
        });
    });

    describe("requirePending", () => {
        it("returns the session when pending token is valid", async () => {
            const { signPending, mw } = await load();
            const token = await signPending({ sub: "phone:9876543210", phone: "9876543210" });
            const result = await mw.requirePending({
                getPendingCookie: async () => token,
            });
            expect(result.session.phone).toBe("9876543210");
            expect(result.session.purpose).toBe("pending_reg");
        });

        it("throws UnauthorizedError when no pending cookie", async () => {
            const { mw } = await load();
            await expect(mw.requirePending({ getPendingCookie: async () => undefined })).rejects.toMatchObject({
                code: "UNAUTHORIZED",
                status: 401,
            });
        });

        it("throws UnauthorizedError when token is wrong purpose", async () => {
            const { signAuth, mw } = await load();
            const token = await signAuth({ sub: "u", phone: "1" });
            await expect(mw.requirePending({ getPendingCookie: async () => token })).rejects.toMatchObject({
                code: "UNAUTHORIZED",
                status: 401,
            });
        });
    });
});
