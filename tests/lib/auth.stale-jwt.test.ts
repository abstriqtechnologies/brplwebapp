import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
    vi.resetModules();
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
    process.env.NODE_ENV = "test";
    vi.doMock("server-only", () => ({}));
    // redirect() throws a special object that Next.js catches.
    vi.doMock("next/navigation", () => ({
        redirect: (url: string) => {
            throw new Error(`NEXT_REDIRECT:${url}`);
        },
    }));
});

describe("staleJwtRedirect", () => {
    it("redirects to /login?next=<path> (does NOT mutate cookies — that is forbidden in Server Components)", async () => {
        const { staleJwtRedirect } = await import("@/lib/auth/stale-jwt");
        try {
            await staleJwtRedirect("/checkout");
            expect.fail("Expected redirect to throw");
        } catch (err: any) {
            expect(err.message).toBe("NEXT_REDIRECT:/login?next=/checkout");
        }
    });

    it("works for /dashboard path", async () => {
        const { staleJwtRedirect } = await import("@/lib/auth/stale-jwt");
        try {
            await staleJwtRedirect("/dashboard");
            expect.fail("Expected redirect to throw");
        } catch (err: any) {
            expect(err.message).toBe("NEXT_REDIRECT:/login?next=/dashboard");
        }
    });
});
