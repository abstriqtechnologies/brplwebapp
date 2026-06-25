import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * `adminApi.ts` is the legacy auth/response helper used by 47 admin routes.
 * It must preserve the `{ ok, data | error }` envelope for backwards
 * compatibility with the admin UI. Phase 3 refactors it to internally use
 * the new `auth/middleware` helpers (so there's ONE place where auth
 * happens) while keeping the same public shape.
 */

vi.mock("server-only", () => ({}));

describe("adminApi (legacy wrapper)", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    });

    async function load() {
        return await import("@/lib/adminApi");
    }

    describe("response shape", () => {
        it("ok() returns { ok: true, data }", async () => {
            const { ok } = await load();
            const res = ok({ foo: 1 });
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual({ ok: true, data: { foo: 1 } });
        });

        it("ok() supports a custom status code", async () => {
            const { ok } = await load();
            const res = ok({ created: true }, { status: 201 });
            expect(res.status).toBe(201);
        });

        it("fail() returns { ok: false, error } with the given status", async () => {
            const { fail } = await load();
            const res = fail("Bad input", 400);
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body).toEqual({ ok: false, error: "Bad input" });
        });

        it("fail() defaults to status 400", async () => {
            const { fail } = await load();
            const res = fail("oops");
            expect(res.status).toBe(400);
        });

        it("badRequest is an alias for fail(msg, 400)", async () => {
            const { badRequest } = await load();
            const res = badRequest("nope");
            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({ ok: false, error: "nope" });
        });

        it("notFound defaults to 'Not found' / 404", async () => {
            const { notFound } = await load();
            const res = notFound();
            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({ ok: false, error: "Not found" });
        });
    });

    describe("hasRole / isSuperAdmin (new shape: { session, admin })", () => {
        const sessionOf = (role: "superadmin" | "subadmin" | "seo_content") =>
            ({ session: { role, sub: "x", email: "a", purpose: "admin" as const }, admin: {} }) as any;

        it("hasRole: superadmin satisfies any allowed list", async () => {
            const { hasRole } = await load();
            expect(hasRole(sessionOf("superadmin"), ["seo_content"])).toBe(true);
        });
        it("hasRole: subadmin does NOT satisfy superadmin-only", async () => {
            const { hasRole } = await load();
            expect(hasRole(sessionOf("subadmin"), ["superadmin"])).toBe(false);
        });
        it("hasRole: subadmin satisfies subadmin", async () => {
            const { hasRole } = await load();
            expect(hasRole(sessionOf("subadmin"), ["subadmin"])).toBe(true);
        });
        it("isSuperAdmin: only superadmin", async () => {
            const { isSuperAdmin } = await load();
            expect(isSuperAdmin(sessionOf("superadmin"))).toBe(true);
            expect(isSuperAdmin(sessionOf("subadmin"))).toBe(false);
        });
    });
});
