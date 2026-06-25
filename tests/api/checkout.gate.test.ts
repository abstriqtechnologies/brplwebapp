import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
    process.env.NODE_ENV = "test";
});

async function mintAuthToken(payload: { sub: string; phone: string; paid?: boolean }) {
    const { signAuth } = await import("@/lib/auth/crypto");
    return signAuth(payload);
}

async function mintPendingToken(phone: string) {
    const { signPending } = await import("@/lib/auth/crypto");
    return signPending({ sub: `pending:${phone}`, phone });
}

async function callMiddleware(req: Request) {
    const { middleware } = await import("@/middleware");
    return middleware(req as any);
}

function reqWithCookies(pathname: string, cookies: Record<string, string>) {
    const url = `https://example.test${pathname}`;
    const { NextRequest } = require("next/server");
    const headers = new Headers();
    for (const [k, v] of Object.entries(cookies)) headers.append("cookie", `${k}=${v}`);
    return new NextRequest(url, { headers });
}

describe("middleware /dashboard gate", () => {
    it("redirects unauth user to /login?next=/dashboard", async () => {
        const req = reqWithCookies("/dashboard", {});
        const res = await callMiddleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login?next=%2Fdashboard");
    });

    it("allows auth+paid user through", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: true });
        const req = reqWithCookies("/dashboard", { brpl_auth: token });
        const res = await callMiddleware(req);
        // next() returns a passthrough response (status 200)
        expect(res.status).toBe(200);
    });

    it("redirects auth+unpaid user to /checkout", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: false });
        const req = reqWithCookies("/dashboard", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/checkout?next=%2Fdashboard");
    });
});

describe("middleware /checkout gate", () => {
    it("redirects no-cookie user to /login?next=/checkout", async () => {
        const req = reqWithCookies("/checkout", {});
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/login?next=%2Fcheckout");
    });

    it("allows pending cookie through", async () => {
        const token = await mintPendingToken("9876543210");
        const req = reqWithCookies("/checkout", { brpl_pending: token });
        const res = await callMiddleware(req);
        expect(res.status).toBe(200);
    });

    it("allows auth+unpaid through", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: false });
        const req = reqWithCookies("/checkout", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect(res.status).toBe(200);
    });

    it("redirects auth+paid straight to /dashboard", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: true });
        const req = reqWithCookies("/checkout", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/dashboard");
    });
});