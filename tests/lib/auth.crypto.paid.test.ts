import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
});

describe("signAuth carries `paid` round-trip", () => {
    it("signs and verifies a payload with paid=true", async () => {
        const { signAuth, verifyAuth } = await import("@/lib/auth/crypto");
        const token = await signAuth({
            sub: "user-1",
            phone: "9876543210",
            paid: true,
        });
        const payload = await verifyAuth(token);
        expect(payload).not.toBeNull();
        expect(payload?.paid).toBe(true);
    });

    it("signs and verifies a payload with paid=false", async () => {
        const { signAuth, verifyAuth } = await import("@/lib/auth/crypto");
        const token = await signAuth({
            sub: "user-2",
            phone: "9876543210",
            paid: false,
        });
        const payload = await verifyAuth(token);
        expect(payload?.paid).toBe(false);
    });

    it("omits paid when not provided (legacy token shape)", async () => {
        const { signAuth, verifyAuth } = await import("@/lib/auth/crypto");
        const token = await signAuth({
            sub: "user-3",
            phone: "9876543210",
            // no `paid`
        });
        const payload = await verifyAuth(token);
        expect(payload?.paid).toBeUndefined();
    });
});
