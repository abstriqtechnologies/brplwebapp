import { describe, it, expect } from "vitest";
import { computeDashboard } from "@/lib/infra/db/dashboard-aggregations";
import type { IUser } from "@/models/User";
import type { ICoupon } from "@/models/Coupon";

function makeUser(over: Partial<IUser> & { createdAt: Date }): IUser {
    return {
        _id: over._id ?? ("u_" + Math.random().toString(36).slice(2)),
        phone: over.phone ?? "9000000000",
        name: over.name,
        email: over.email,
        role: over.role,
        state: over.state,
        city: over.city,
        paymentStatus: over.paymentStatus ?? "pending",
        Trial_status: over.Trial_status,
        paymentId: over.paymentId,
        orderId: over.orderId,
        amount: over.amount,
        couponId: over.couponId,
        couponCode: over.couponCode,
        couponDiscount: over.couponDiscount,
        couponAppliedAt: over.couponAppliedAt,
        profileImage: over.profileImage,
        createdAt: over.createdAt,
        updatedAt: over.createdAt,
    } as unknown as IUser;
}

function makeCoupon(over: Partial<ICoupon> & { code: string }): ICoupon {
    return {
        _id: (over._id ?? ("c_" + Math.random().toString(36).slice(2))) as ICoupon["_id"],
        code: over.code,
        description: over.description,
        type: over.type ?? "percent",
        amount: over.amount ?? 10,
        usageLimit: over.usageLimit ?? 0,
        usedCount: over.usedCount ?? 0,
        minOrderAmount: over.minOrderAmount,
        active: over.active ?? true,
        source: over.source ?? "manual",
        expiresAt: over.expiresAt,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
    } as unknown as ICoupon;
}

describe("computeDashboard", () => {
    it("returns zeros and empty arrays for empty inputs", () => {
        const out = computeDashboard([], [], {
            from: new Date("2026-06-01"),
            to: new Date("2026-06-30"),
            granularity: "day",
        });
        expect(out.totals.totalPlayers).toBe(0);
        expect(out.totals.registeredPlayers).toBe(0);
        expect(out.totals.pendingPayments).toBe(0);
        expect(out.totals.trialCompleted).toBe(0);
        expect(out.totals.conversionRate).toBe(0);
        expect(out.totals.trialCompletionRate).toBe(0);
        expect(out.totals.totalRevenue).toBe(0);
        expect(out.registrations).toEqual([]);
        expect(out.coupons.rows).toEqual([]);
        expect(out.coupons.topByUsage).toEqual([]);
        expect(out.geo.byState).toEqual([]);
        expect(out.geo.byCity).toEqual([]);
        expect(out.roles).toEqual([]);
        expect(out.recent).toEqual([]);
    });
});

describe("computeDashboard — populated inputs", () => {
    const from = new Date("2026-06-01T00:00:00Z");
    const to = new Date("2026-06-30T23:59:59Z");

    it("totals reflect all users, not just in-range", () => {
        const users = [
            makeUser({ createdAt: new Date("2026-01-01"), paymentStatus: "completed" }),
            makeUser({ createdAt: new Date("2026-06-10"), paymentStatus: "pending" }),
            makeUser({
                createdAt: new Date("2026-06-20"),
                paymentStatus: "completed",
                Trial_status: "completed",
            }),
        ];
        const out = computeDashboard(users, [], { from, to, granularity: "day" });
        expect(out.totals.totalPlayers).toBe(3);
        expect(out.totals.registeredPlayers).toBe(2);
        expect(out.totals.pendingPayments).toBe(1);
        expect(out.totals.trialCompleted).toBe(1);
        expect(out.totals.conversionRate).toBeCloseTo(2 / 3);
        expect(out.totals.totalRevenue).toBe(0);
    });

    it("includes total revenue from user amounts", () => {
        const users = [
            makeUser({ createdAt: new Date("2026-06-10"), paymentStatus: "completed", amount: 500 }),
            makeUser({ createdAt: new Date("2026-06-11"), paymentStatus: "completed", amount: 300 }),
            makeUser({ createdAt: new Date("2026-06-12"), paymentStatus: "pending", amount: 0 }),
        ];
        const out = computeDashboard(users, [], { from, to, granularity: "day" });
        expect(out.totals.totalRevenue).toBe(800);
    });

    it("buckets daily registrations with sorted keys", () => {
        const users = [
            makeUser({ createdAt: new Date("2026-06-15T08:00:00Z") }),
            makeUser({ createdAt: new Date("2026-06-15T18:00:00Z") }),
            makeUser({ createdAt: new Date("2026-06-10T12:00:00Z") }),
        ];
        const out = computeDashboard(users, [], { from, to, granularity: "day" });
        expect(out.registrations).toEqual([
            { bucket: "2026-06-10", count: 1 },
            { bucket: "2026-06-15", count: 2 },
        ]);
    });

    it("joins coupon usage to coupon metadata and flags referrals", () => {
        const users = [
            makeUser({ createdAt: new Date("2026-06-12"), couponCode: "WELCOME10" }),
            makeUser({ createdAt: new Date("2026-06-13"), couponCode: "WELCOME10" }),
            makeUser({ createdAt: new Date("2026-06-14"), couponCode: "REF5" }),
        ];
        const coupons = [
            makeCoupon({
                code: "WELCOME10",
                type: "percent",
                amount: 10,
                usageLimit: 100,
                source: "manual",
                usedCount: 5,
            }),
            makeCoupon({
                code: "REF5",
                type: "flat",
                amount: 50,
                usageLimit: 0,
                source: "referral",
                usedCount: 2,
            }),
        ];
        const out = computeDashboard(users, coupons, { from, to, granularity: "day" });
        expect(out.coupons.rows).toHaveLength(2);
        const welcome = out.coupons.rows.find((r) => r.code === "WELCOME10")!;
        expect(welcome.usedCount).toBe(2);
        expect(welcome.totalUsedAllTime).toBe(5);
        expect(welcome.source).toBe("manual");
        const ref = out.coupons.rows.find((r) => r.code === "REF5")!;
        expect(ref.usedCount).toBe(1);
        expect(ref.source).toBe("referral");
        expect(out.coupons.topByUsage).toHaveLength(1);
        expect(out.coupons.topByUsage[0]).toEqual({ code: "WELCOME10", used: 2 });
        // Referral coupons are excluded from topByUsage
        expect(out.coupons.topByUsage.find((c) => c.code === "REF5")).toBeUndefined();
    });

    it("aggregates geo by state and city with stable ordering", () => {
        const users = [
            makeUser({ createdAt: new Date("2026-06-12"), state: "MH", city: "Mumbai" }),
            makeUser({ createdAt: new Date("2026-06-12"), state: "MH", city: "Mumbai" }),
            makeUser({ createdAt: new Date("2026-06-12"), state: "MH", city: "Pune" }),
            makeUser({ createdAt: new Date("2026-06-12"), state: "KA", city: "Bangalore" }),
        ];
        const out = computeDashboard(users, [], { from, to, granularity: "day" });
        expect(out.geo.byState).toEqual([
            { state: "MH", count: 3 },
            { state: "KA", count: 1 },
        ]);
        expect(out.geo.byCity[0]).toEqual({ state: "MH", city: "Mumbai", count: 2 });
    });

    it("returns the most-recent 10 in-range users, sorted desc", () => {
        const users = Array.from({ length: 12 }, (_, i) =>
            makeUser({ createdAt: new Date(`2026-06-${String(i + 1).padStart(2, "0")}T00:00:00Z`) }),
        );
        const out = computeDashboard(users, [], { from, to, granularity: "day" });
        expect(out.recent).toHaveLength(10);
        expect(out.recent[0].registeredAt > out.recent[9].registeredAt).toBe(true);
    });
});