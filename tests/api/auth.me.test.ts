import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import mongoose from "mongoose";

// Stub auth/DB modules before importing the route
vi.mock("@/lib/mongodb", () => ({
    connectDB: vi.fn().mockResolvedValue(undefined),
}));

// Mutable jwt mock so each test can swap in the created user's id as `sub`
const verifyJwt = vi.fn();
vi.mock("@/lib/jwt", () => ({
    getAuthCookie: vi.fn().mockResolvedValue("test-token"),
    verifyJwt,
}));

beforeAll(() => {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI must be set for integration tests");
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe("GET /api/auth/me", () => {
    it("includes profileImage (null) when user has none", async () => {
        const User = (await import("@/models/User")).default;
        await mongoose.connect(process.env.MONGODB_URI!);
        const phone = `8${Math.floor(Math.random() * 1e9).toString().padStart(9, "0")}`;
        const created = await User.create({
            phone,
            name: "Test Player",
            paymentStatus: "pending",
        });
        // Point the mocked JWT at the real user we just inserted
        verifyJwt.mockResolvedValueOnce({
            sub: created._id.toString(),
            phone,
            purpose: "auth",
        });
        // Re-import the route AFTER stubbing so it picks up our mocks
        const { GET } = await import("@/app/api/auth/me/route");
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.user).toMatchObject({
            phone,
            name: "Test Player",
            paymentStatus: "pending",
            profileImage: null,
        });
        await User.deleteOne({ _id: created._id });
    });

    it("includes profileImage string when user has one set", async () => {
        const User = (await import("@/models/User")).default;
        const phone = `7${Math.floor(Math.random() * 1e9).toString().padStart(9, "0")}`;
        const created = await User.create({
            phone,
            name: "Has Avatar",
            paymentStatus: "completed",
            profileImage: "https://example.com/me.jpg",
        });
        verifyJwt.mockResolvedValueOnce({
            sub: created._id.toString(),
            phone,
            purpose: "auth",
        });
        const { GET } = await import("@/app/api/auth/me/route");
        const res = await GET();
        const body = await res.json();
        expect(body.user).toMatchObject({
            phone,
            profileImage: "https://example.com/me.jpg",
        });
        await User.deleteOne({ _id: created._id });
    });
});
