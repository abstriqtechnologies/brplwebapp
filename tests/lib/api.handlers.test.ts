import { describe, it, expect, beforeEach, vi } from "vitest";

// "server-only" is a marker package shipped inside Next. The vitest resolver
// doesn't know about that internal path, so we alias it to a no-op here.
vi.mock("server-only", () => ({}));

/**
 * Composable route-handler wrappers.
 *
 *   withRequest(fn)                  — requestId, error catch, JSON envelope
 *   withRateLimit(bucket)(fn)        — token-bucket per IP
 *   withCsrf(fn)                     — assertCsrf before calling
 *   withAuth(lookup)(fn)             — requireAuth; passes session to fn
 *   withAdmin(opts)(fn)              — requireAdmin + optional allowedRoles
 *
 * Composition: each is a higher-order function. Order matters: typically
 *
 *   withRequest(withAuth(withCsrf(handler)))
 *
 * The innermost handler receives `{ req, requestId, ...session }`; outer
 * wrappers add context.
 *
 * All errors propagate up. `withRequest` is the boundary that catches
 * AppErrors and unknown errors and produces a JSON response.
 */

describe("api/handlers", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
        process.env.BRPL_CSRF_REQUIRED = "true";
    });

    /**
     * Load the modules. Cookie reads are now injected at call-time
     * (via `getAuthCookie`/`getAdminCookie`/`readCsrf` parameters), so we
     * don't need to mock `next/headers`.
     */
    async function load() {
        const handlers = await import("@/lib/api/handlers");
        const crypto = await import("@/lib/auth/crypto");
        const errors = await import("@/lib/api/errors");
        return { handlers, crypto, errors };
    }

    function makeStore(initial: Record<string, string> = {}) {
        const jar = new Map(Object.entries(initial));
        return {
            get: (n: string) => {
                const v = jar.get(n);
                return v ? { name: n, value: v } : undefined;
            },
            set: (n: string, v: string) => {
                jar.set(n, v);
            },
            delete: (n: string) => {
                jar.delete(n);
            },
            _jar: jar,
        };
    }

    // ---------- withRequest ----------

    describe("withRequest", () => {
        it("passes requestId to the handler and returns its response", async () => {
            const { handlers } = await load();
            const wrapped = handlers.withRequest(async ({ requestId }) => {
                return new Response(JSON.stringify({ ok: true, requestId }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            });
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.ok).toBe(true);
            expect(typeof body.requestId).toBe("string");
            expect(body.requestId.length).toBeGreaterThan(0);
        });

        it("catches an AppError and returns its declared status + envelope", async () => {
            const { handlers, errors } = await load();
            const wrapped = handlers.withRequest(async () => {
                throw new errors.NotFoundError("user not found");
            });
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(404);
            const body = await res.json();
            expect(body).toMatchObject({ ok: false, code: "NOT_FOUND", message: "user not found" });
            expect(typeof body.requestId).toBe("string");
        });

        it("catches a ValidationError and forwards details", async () => {
            const { handlers, errors } = await load();
            const wrapped = handlers.withRequest(async () => {
                throw new errors.ValidationError({ field: "phone", reason: "required" });
            });
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
            expect(body.details).toEqual({ field: "phone", reason: "required" });
        });

        it("catches a RateLimitError and adds Retry-After header", async () => {
            const { handlers, errors } = await load();
            const wrapped = handlers.withRequest(async () => {
                throw new errors.RateLimitError(42);
            });
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(429);
            expect(res.headers.get("Retry-After")).toBe("42");
        });

        it("converts an unknown thrown error into a generic 500 (no leak)", async () => {
            const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            const { handlers } = await load();
            const wrapped = handlers.withRequest(async () => {
                throw new Error("SECRET INTERNAL DETAILS — must not leak");
            });
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body).toMatchObject({ ok: false, code: "INTERNAL" });
            expect(JSON.stringify(body)).not.toContain("SECRET INTERNAL DETAILS");
            // The original error IS logged server-side.
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });

    // ---------- withRateLimit ----------

    describe("withRateLimit", () => {
        it("passes through when the bucket has tokens", async () => {
            const { handlers } = await load();
            const wrapped = handlers.withRequest(
                handlers.withRateLimit(
                    { capacity: 1, refillPerSec: 0 },
                    undefined,
                    () => "1.1.1.1",
                )(async () => new Response("ok", { status: 200 })),
            );
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(200);
        });

        it("returns 429 with Retry-After when the bucket is empty", async () => {
            const { handlers } = await load();
            const wrapped = handlers.withRequest(
                handlers.withRateLimit(
                    { capacity: 1, refillPerSec: 0 },
                    undefined,
                    () => "1.1.1.1",
                )(async () => new Response("ok", { status: 200 })),
            );
            await wrapped(new Request("http://x/"));
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(429);
            expect(res.headers.get("Retry-After")).toBeDefined();
        });

        it("isolates buckets per IP", async () => {
            const { handlers } = await load();
            let ip = "1.1.1.1";
            const wrapped = handlers.withRequest(
                handlers.withRateLimit(
                    { capacity: 1, refillPerSec: 0 },
                    undefined,
                    () => ip,
                )(async () => new Response("ok", { status: 200 })),
            );
            await wrapped(new Request("http://x/"));
            ip = "2.2.2.2";
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(200);
        });

        it("uses 'global' as the key when no IP getter is provided", async () => {
            const { handlers } = await load();
            const wrapped = handlers.withRequest(
                handlers.withRateLimit({ capacity: 1, refillPerSec: 0 })(async () => new Response("ok")),
            );
            await wrapped(new Request("http://x/"));
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(429);
        });
    });

    // ---------- withCsrf ----------

    describe("withCsrf", () => {
        it("passes through when CSRF is valid", async () => {
            const { handlers } = await load();
            const wrapped = handlers.withRequest(
                handlers.withCsrf(
                    async () => new Response("ok"),
                    async () => "good",
                ),
            );
            const req = new Request("http://x/", { headers: { "x-csrf-token": "good" } });
            const res = await wrapped(req);
            expect(res.status).toBe(200);
        });

        it("returns 403 when CSRF cookie is missing", async () => {
            const { handlers } = await load();
            const wrapped = handlers.withRequest(
                handlers.withCsrf(
                    async () => new Response("ok"),
                    async () => undefined,
                ),
            );
            const req = new Request("http://x/", { headers: { "x-csrf-token": "good" } });
            const res = await wrapped(req);
            expect(res.status).toBe(403);
        });
    });

    // ---------- withAuth ----------

    describe("withAuth", () => {
        it("invokes the handler with the user session when auth succeeds", async () => {
            const { handlers, crypto } = await load();
            const token = await crypto.signAuth({ sub: "user_1", phone: "9876543210" });
            const wrapped = handlers.withRequest(
                handlers.withAuth({
                    getAuthCookie: async () => token,
                    lookup: async (id) => (id === "user_1" ? { _id: "user_1", phone: "9876543210" } : null),
                })(async ({ user }) => {
                    return new Response(JSON.stringify({ userId: user._id }), { status: 200 });
                }),
            );
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.userId).toBe("user_1");
        });

        it("returns 401 when there is no auth cookie", async () => {
            const { handlers } = await load();
            const wrapped = handlers.withRequest(
                handlers.withAuth({
                    getAuthCookie: async () => undefined,
                    lookup: async () => ({ _id: "u", phone: "1" }),
                })(async () => new Response("ok")),
            );
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(401);
        });
    });

    // ---------- withAdmin ----------

    describe("withAdmin", () => {
        it("invokes the handler with the admin session", async () => {
            const { handlers, crypto } = await load();
            const token = await crypto.signAdmin({ sub: "a1", email: "a@a", role: "superadmin" });
            const wrapped = handlers.withRequest(
                handlers.withAdmin({
                    getAdminCookie: async () => token,
                    lookup: async () => ({ _id: "a1", email: "a@a", role: "superadmin", active: true }),
                })(async ({ admin }) => {
                    return new Response(JSON.stringify({ role: admin.role }), { status: 200 });
                }),
            );
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.role).toBe("superadmin");
        });

        it("returns 403 when the role is not in the allowed list", async () => {
            const { handlers, crypto } = await load();
            const token = await crypto.signAdmin({ sub: "a1", email: "a@a", role: "seo_content" });
            const wrapped = handlers.withRequest(
                handlers.withAdmin({
                    getAdminCookie: async () => token,
                    lookup: async () => ({ _id: "a1", email: "a@a", role: "seo_content", active: true }),
                    allowedRoles: ["superadmin"],
                })(async () => new Response("ok")),
            );
            const res = await wrapped(new Request("http://x/"));
            expect(res.status).toBe(403);
        });
    });

    // ---------- composition ----------

    describe("composition", () => {
        it("withRequest(withAuth(handler)) propagates requestId AND session", async () => {
            const { handlers, crypto } = await load();
            const token = await crypto.signAuth({ sub: "user_1", phone: "1" });
            const inner = handlers.withAuth({
                getAuthCookie: async () => token,
                lookup: async (id) => (id === "user_1" ? { _id: "user_1", phone: "1" } : null),
            })(async ({ user, requestId }) => {
                return new Response(JSON.stringify({ userId: user._id, requestId }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            });
            const wrapped = handlers.withRequest(inner);
            const res = await wrapped(new Request("http://x/"));
            const body = await res.json();
            expect(body.userId).toBe("user_1");
            expect(typeof body.requestId).toBe("string");
        });
    });
});
