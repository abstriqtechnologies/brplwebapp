import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
    vi.resetModules();
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
    process.env.NODE_ENV = "test";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    vi.doMock("server-only", () => ({}));
});

describe("domain/coupon validateCoupon", () => {
    async function load() {
        const repos = await import("@/lib/infra/db/repos");
        const coupon = await import("@/lib/domain/coupon/service");
        return { repo: new repos.InMemoryCouponRepo(), coupon };
    }

    it("rejects an unknown code with reason 'not_found'", async () => {
        const { repo, coupon } = await load();
        const result = await coupon.validateCoupon({
            code: "NOPE",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("not_found");
    });

    it("rejects an inactive coupon with reason 'inactive'", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "OFF",
            type: "flat",
            amount: 100,
            usageLimit: 10,
            usedCount: 0,
            active: false,
        });
        const result = await coupon.validateCoupon({
            code: "off",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("inactive");
    });

    it("rejects an expired coupon with reason 'expired'", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "OLD",
            type: "flat",
            amount: 100,
            usageLimit: 10,
            usedCount: 0,
            active: true,
            expiresAt: new Date(Date.now() - 1000),
        });
        const result = await coupon.validateCoupon({
            code: "OLD",
            orderAmountRupees: 1499,
            couponRepo: repo,
            now: () => Date.now(),
        });
        expect(result.reason).toBe("expired");
    });

    it("rejects an exhausted coupon with reason 'exhausted'", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "GONE",
            type: "flat",
            amount: 100,
            usageLimit: 1,
            usedCount: 1,
            active: true,
        });
        const result = await coupon.validateCoupon({
            code: "GONE",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.reason).toBe("exhausted");
    });

    it("rejects when order amount is below minOrderAmount with reason 'min_order'", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "BIGONLY",
            type: "flat",
            amount: 100,
            usageLimit: 10,
            usedCount: 0,
            active: true,
            minOrderAmount: 2000,
        });
        const result = await coupon.validateCoupon({
            code: "BIGONLY",
            orderAmountRupees: 1499, // below minOrderAmount: 2000
            couponRepo: repo,
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("min_order");
    });

    it("accepts a flat-amount coupon and computes discount + finalAmount", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "FLAT100",
            type: "flat",
            amount: 100,
            usageLimit: 10,
            usedCount: 0,
            active: true,
        });
        const result = await coupon.validateCoupon({
            code: "FLAT100",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.valid).toBe(true);
        expect(result.discount).toBe(100);
        expect(result.finalAmount).toBe(1399);
    });

    it("accepts a percent coupon and computes discount + finalAmount", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "TEN",
            type: "percent",
            amount: 10,
            usageLimit: 10,
            usedCount: 0,
            active: true,
        });
        const result = await coupon.validateCoupon({
            code: "TEN",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.discount).toBe(150); // 10% of 1499, rounded
        expect(result.finalAmount).toBe(1349);
    });

    it("clamps discount so finalAmount never goes below zero", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "MEGA",
            type: "flat",
            amount: 5000,
            usageLimit: 10,
            usedCount: 0,
            active: true,
        });
        const result = await coupon.validateCoupon({
            code: "MEGA",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.discount).toBe(1499);
        expect(result.finalAmount).toBe(0);
    });
});

describe("domain/coupon redeemCoupon", () => {
    async function load() {
        const repos = await import("@/lib/infra/db/repos");
        const coupon = await import("@/lib/domain/coupon/service");
        return { repo: new repos.InMemoryCouponRepo(), coupon };
    }

    it("records usage and bumps usedCount atomically", async () => {
        const { repo, coupon } = await load();
        const c = await repo.create({
            code: "X",
            type: "flat",
            amount: 100,
            usageLimit: 10,
            usedCount: 0,
            active: true,
        });
        await coupon.redeemCoupon({
            code: "X",
            userId: "u-1",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        const after = await repo.findByCode("X");
        expect(after?.usedCount).toBe(1);
        const usage = await repo.findUsageForUser(String(c._id), "u-1");
        expect(usage).not.toBeNull();
        expect(usage?.discountApplied).toBe(100);
    });

    it("throws ConflictError if user already redeemed this coupon", async () => {
        const { repo, coupon } = await load();
        const c = await repo.create({
            code: "ONCE",
            type: "flat",
            amount: 100,
            usageLimit: 100,
            usedCount: 0,
            active: true,
        });
        await coupon.redeemCoupon({
            code: "ONCE",
            userId: "u-1",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        await expect(
            coupon.redeemCoupon({
                code: "ONCE",
                userId: "u-1",
                orderAmountRupees: 1499,
                couponRepo: repo,
            }),
        ).rejects.toThrow(/already/i);
        const after = await repo.findByCode("ONCE");
        expect(after?.usedCount).toBe(1); // not bumped twice
    });
});
