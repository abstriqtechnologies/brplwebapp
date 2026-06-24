import { describe, it, expect, beforeAll } from "vitest";
import { GET } from "@/app/api/blog/route";

beforeAll(() => {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI must be set for integration tests");
    }
});

describe("GET /api/blog (public)", () => {
    it("returns { success, data }", async () => {
        const req = new Request("http://localhost/api/blog");
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty("success", true);
        expect(Array.isArray(body.data)).toBe(true);
    });
});