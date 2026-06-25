import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Integration test: prove the new auth helpers (`withRequest + withAdmin`)
 * produce the expected wire format on a real route handler.
 *
 * We don't import the route file directly (it pulls in Mongoose + sharp).
 * Instead we re-implement the same handler shape and assert the response
 * envelope, status codes, and behaviour. The actual route migration is
 * scheduled for Phase 3.
 */

vi.mock("server-only", () => ({}));

describe("integration: withRequest(withAdmin(handler)) produces expected responses", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    });

    it("GET /api/admin/me returns 200 with admin data when auth is valid", async () => {
        const { signAdmin } = await import("@/lib/auth/crypto");
        const { withRequest, withAdmin } = await import("@/lib/api/handlers");

        const token = await signAdmin({
            sub: "admin_1",
            email: "admin@brpl.com",
            role: "superadmin",
            name: "Test Admin",
        });

        const handler = withRequest(
            withAdmin({
                getAdminCookie: async () => token,
                lookup: async () => ({
                    _id: "admin_1",
                    email: "admin@brpl.com",
                    role: "superadmin",
                    active: true,
                }),
            })(async ({ admin }) => {
                return new Response(
                    JSON.stringify({
                        email: admin.email,
                        role: admin.role,
                        sub: admin._id.toString(),
                    }),
                    { status: 200, headers: { "content-type": "application/json" } },
                );
            }),
        );

        const res = await handler(new Request("http://x/api/admin/me"));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({
            email: "admin@brpl.com",
            role: "superadmin",
            sub: "admin_1",
        });
        // withRequest echoes the request ID on every response.
        expect(res.headers.get("x-request-id")).toBeDefined();
    });

    it("returns 401 with the new error envelope when no admin cookie", async () => {
        const { withRequest, withAdmin } = await import("@/lib/api/handlers");

        const handler = withRequest(
            withAdmin({
                getAdminCookie: async () => undefined,
                lookup: async () => ({
                    _id: "a1",
                    email: "a@a",
                    role: "superadmin",
                    active: true,
                }),
            })(async () => new Response("ok")),
        );

        const res = await handler(new Request("http://x/api/admin/me"));
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toMatchObject({
            ok: false,
            code: "UNAUTHORIZED",
            message: "Authentication required",
        });
        expect(typeof body.requestId).toBe("string");
    });

    it("returns 403 with allowedRoles hint when role doesn't match", async () => {
        const { signAdmin } = await import("@/lib/auth/crypto");
        const { withRequest, withAdmin } = await import("@/lib/api/handlers");

        const token = await signAdmin({
            sub: "admin_1",
            email: "seo@brpl.com",
            role: "seo_content",
        });

        const handler = withRequest(
            withAdmin({
                getAdminCookie: async () => token,
                lookup: async () => ({
                    _id: "admin_1",
                    email: "seo@brpl.com",
                    role: "seo_content",
                    active: true,
                }),
                allowedRoles: ["superadmin"],
            })(async () => new Response("ok")),
        );

        const res = await handler(new Request("http://x/api/admin/dangerous"));
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("FORBIDDEN");
        expect(body.message).toMatch(/superadmin/);
    });

    it("superadmin satisfies any allowedRoles list (hierarchy)", async () => {
        const { signAdmin } = await import("@/lib/auth/crypto");
        const { withRequest, withAdmin } = await import("@/lib/api/handlers");

        const token = await signAdmin({
            sub: "admin_1",
            email: "a@a",
            role: "superadmin",
        });

        const handler = withRequest(
            withAdmin({
                getAdminCookie: async () => token,
                lookup: async () => ({
                    _id: "admin_1",
                    email: "a@a",
                    role: "superadmin",
                    active: true,
                }),
                allowedRoles: ["seo_content"], // superadmin ≥ seo_content
            })(async () => new Response("ok", { status: 200 })),
        );

        const res = await handler(new Request("http://x/api/admin/anything"));
        expect(res.status).toBe(200);
    });

    it("returns 401 when admin is inactive", async () => {
        const { signAdmin } = await import("@/lib/auth/crypto");
        const { withRequest, withAdmin } = await import("@/lib/api/handlers");

        const token = await signAdmin({
            sub: "admin_1",
            email: "a@a",
            role: "subadmin",
        });

        const handler = withRequest(
            withAdmin({
                getAdminCookie: async () => token,
                lookup: async () => ({
                    _id: "admin_1",
                    email: "a@a",
                    role: "subadmin",
                    active: false,
                }),
            })(async () => new Response("ok")),
        );

        const res = await handler(new Request("http://x/api/admin/me"));
        expect(res.status).toBe(401);
    });
});
