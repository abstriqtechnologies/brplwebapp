import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryCouponRepo } from "@/lib/infra/db/repos";

describe("InMemoryCouponRepo", () => {
    let repo: InMemoryCouponRepo;
    beforeEach(() => {
        repo = new InMemoryCouponRepo();
    });

    it("finds a coupon by code (case-insensitive, normalized to uppercase)", async () => {
        await repo.create({
            code: "SAVE10",
            type: "percent",
            amount: 10,
            usageLimit: 100,
            usedCount: 0,
            active: true,
        });
        const found = await repo.findByCode("save10");
        expect(found).not.toBeNull();
        expect(found?.code).toBe("SAVE10");
    });

    it("returns null for unknown code", async () => {
        const found = await repo.findByCode("NOPE");
        expect(found).toBeNull();
    });

    it("incrementUsage bumps usedCount and returns updated coupon", async () => {
        const c = await repo.create({
            code: "X",
            type: "flat",
            amount: 100,
            usageLimit: 5,
            usedCount: 0,
            active: true,
        });
        const updated = await repo.incrementUsage(String(c._id));
        expect(updated?.usedCount).toBe(1);
    });

    it("findUsageForUser returns existing usage to prevent double-redeem", async () => {
        const c = await repo.create({
            code: "ONCE",
            type: "flat",
            amount: 100,
            usageLimit: 1,
            usedCount: 0,
            active: true,
        });
        await repo.createUsage({
            couponId: String(c._id),
            userId: "u-1",
            code: c.code,
            discountApplied: 100,
        });
        const found = await repo.findUsageForUser(String(c._id), "u-1");
        expect(found).not.toBeNull();
    });
});