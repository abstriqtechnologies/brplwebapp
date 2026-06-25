import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
    vi.resetModules();
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
    process.env.NODE_ENV = "test";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    vi.doMock("server-only", () => ({}));
    // Avoid touching a real Mongo connection in tests.
    vi.doMock("@/lib/mongodb", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
    }));
});

async function load() {
    const repos = await import("@/lib/infra/db/repos");
    const userRepo = new repos.InMemoryUserRepo();
    const couponRepo = new repos.InMemoryCouponRepo();
    const paymentRepo = new repos.InMemoryPaymentRepo();

    // Mock next/headers with an in-memory cookie store seeded per test.
    const cookieJar: Record<string, string> = {};
    vi.doMock("next/headers", () => ({
        cookies: async () => ({
            get: (name: string) => (cookieJar[name] ? { name, value: cookieJar[name] } : undefined),
            set: (name: string, value: string) => {
                cookieJar[name] = value;
            },
            delete: (name: string) => {
                delete cookieJar[name];
            },
        }),
        headers: async () => ({ get: () => null }),
    }));

    // Mock the mongoose repos so the route transparently uses the
    // in-memory instances. This keeps the test DB-agnostic.
    vi.doMock("@/lib/infra/db/mongoose-repos", () => ({
        MongooseUserRepo: class {
            constructor() {
                return userRepo;
            }
        },
        MongooseCouponRepo: class {
            constructor() {
                return couponRepo;
            }
        },
        MongoosePaymentRepo: class {
            constructor() {
                return paymentRepo;
            }
        },
    }));

    const { POST } = await import("@/app/api/payment/redeem-coupon/route");
    return {
        userRepo,
        couponRepo,
        paymentRepo,
        cookieJar,
        POST,
    };
}

describe("POST /api/payment/redeem-coupon (dry-run validation)", () => {
    it("returns valid:true with discount for a known coupon", async () => {
        const { userRepo, couponRepo, POST, cookieJar } = await load();
        await userRepo.create({ phone: "9876543210" });
        await couponRepo.create({
            code: "FLAT100",
            type: "flat",
            amount: 100,
            usageLimit: 5,
            usedCount: 0,
            active: true,
        });
        const { signPending } = await import("@/lib/auth/crypto");
        const token = await signPending({ sub: "pending:9876543210", phone: "9876543210" });
        cookieJar["brpl_pending"] = token;
        const r = new Request("http://localhost/api/payment/redeem-coupon?dryRun=1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: "FLAT100", orderAmountRupees: 1499 }),
        });
        const res = await POST(r as any);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(true);
        expect(data.discount).toBe(100);
        expect(data.finalAmount).toBe(1399);
        // Validate (dry-run) does NOT consume.
        const after = await couponRepo.findByCode("FLAT100");
        expect(after?.usedCount).toBe(0);
    });

    it("returns valid:false with reason for unknown code", async () => {
        const { POST, cookieJar } = await load();
        const { signPending } = await import("@/lib/auth/crypto");
        const token = await signPending({ sub: "pending:9876543210", phone: "9876543210" });
        cookieJar["brpl_pending"] = token;
        const r = new Request("http://localhost/api/payment/redeem-coupon?dryRun=1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: "NOPE", orderAmountRupees: 1499 }),
        });
        const res = await POST(r as any);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(false);
        expect(data.reason).toBe("not_found");
    });

    it("consumes the coupon when not a dry-run", async () => {
        const { userRepo, couponRepo, POST, cookieJar } = await load();
        const user = await userRepo.create({ phone: "9876543210" });
        await couponRepo.create({
            code: "ONCE",
            type: "flat",
            amount: 100,
            usageLimit: 100,
            usedCount: 0,
            active: true,
        });
        const { signAuth } = await import("@/lib/auth/crypto");
        const token = await signAuth({
            sub: String(user._id),
            phone: "9876543210",
            paid: false,
        });
        cookieJar["brpl_auth"] = token;
        const r = new Request("http://localhost/api/payment/redeem-coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: "ONCE", orderAmountRupees: 1499 }),
        });
        const res = await POST(r as any);
        expect(res.status).toBe(200);
        const after = await couponRepo.findByCode("ONCE");
        expect(after?.usedCount).toBe(1);
    });
});