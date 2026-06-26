import { describe, it, expect, beforeAll, vi } from "vitest";

beforeAll(() => {
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
    process.env.NODE_ENV = "test";
    // session-guard.ts (transitively imported via middleware) uses "server-only"
    // to gate it to server contexts. Stub it for the test environment.
    vi.doMock("server-only", () => ({}));
});

async function mintAuthToken(payload: { sub: string; phone: string; paid?: boolean }) {
    const { signAuth } = await import("@/lib/auth/crypto");
    return signAuth(payload);
}

async function mintPendingToken(phone: string) {
    const { signPending } = await import("@/lib/auth/crypto");
    return signPending({ sub: `pending:${phone}`, phone });
}

async function mintAuthTokenForMissingUser(phone: string) {
    const { signAuth } = await import("@/lib/auth/crypto");
    return signAuth({ sub: "nonexistent-user-id-xyz", phone, paid: false });
}

async function callMiddleware(req: Request) {
    const { middleware } = await import("@/middleware");
    return middleware(req as any);
}

async function reqWithCookies(pathname: string, cookies: Record<string, string>) {
    const url = `https://example.test${pathname}`;
    const { NextRequest } = await import("next/server");
    const headers = new Headers();
    for (const [k, v] of Object.entries(cookies)) headers.append("cookie", `${k}=${v}`);
    return new NextRequest(url, { headers });
}

describe("middleware /dashboard gate", () => {
    it("redirects unauth user to /login?next=/dashboard", async () => {
        const req = await reqWithCookies("/dashboard", {});
        const res = await callMiddleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login?next=%2Fdashboard");
    });

    it("allows auth+paid user through", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: true });
        const req = await reqWithCookies("/dashboard", { brpl_auth: token });
        const res = await callMiddleware(req);
        // next() returns a passthrough response (status 200)
        expect(res.status).toBe(200);
    });

    it("redirects auth+unpaid user to /checkout", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: false });
        const req = await reqWithCookies("/dashboard", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/checkout?next=%2Fdashboard");
    });

    it("treats a token missing paid as unpaid (bounces to /checkout)", async () => {
        // Legacy tokens issued before Task 1 don't have the `paid` field.
        // Middleware must treat them as unpaid, not pass them through.
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210" });
        const req = await reqWithCookies("/dashboard", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/checkout?next=%2Fdashboard");
    });
});

describe("middleware /checkout gate", () => {
    it("redirects no-cookie user to /login?next=/checkout", async () => {
        const req = await reqWithCookies("/checkout", {});
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/login?next=%2Fcheckout");
    });

    it("allows pending cookie through", async () => {
        const token = await mintPendingToken("9876543210");
        const req = await reqWithCookies("/checkout", { brpl_pending: token });
        const res = await callMiddleware(req);
        expect(res.status).toBe(200);
    });

    it("allows auth+unpaid through", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: false });
        const req = await reqWithCookies("/checkout", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect(res.status).toBe(200);
    });

    it("redirects auth+paid straight to /dashboard", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: true });
        const req = await reqWithCookies("/checkout", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/dashboard");
    });

    it("treats a token missing paid as unpaid (allows /checkout)", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210" });
        const req = await reqWithCookies("/checkout", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect(res.status).toBe(200);
    });

    // Note: per the Task 2 architecture decision, the middleware uses a
    // synthetic-user lookup stub, so the `user_missing` branch can never
    // fire from production traffic through middleware. The actual stale-JWT
    // cleanup happens at the page level — see tests/lib/auth.stale-jwt.test.ts.
    // This test only exercises the helper to confirm it produces a valid
    // token that middleware will accept (the page-level redirect then
    // triggers cleanup when `User.findById` returns null).
    it("mintAuthTokenForMissingUser produces a structurally valid token that middleware accepts", async () => {
        const token = await mintAuthTokenForMissingUser("9876543210");
        const { verifyAuth } = await import("@/lib/auth/crypto");
        const payload = await verifyAuth(token);
        expect(payload).not.toBeNull();
        expect(payload?.sub).toBe("nonexistent-user-id-xyz");
        expect(payload?.paid).toBe(false);
        const req = await reqWithCookies("/checkout", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect(res.status).toBe(200);
    });
});
