import { describe, it, expect } from "vitest";
import { computeDashboard } from "@/lib/infra/db/dashboard-aggregations";
import type { IUser } from "@/models/User";
import type { ICoupon } from "@/models/Coupon";

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
        expect(out.registrations).toEqual([]);
        expect(out.coupons.rows).toEqual([]);
        expect(out.coupons.topByUsage).toEqual([]);
        expect(out.geo.byState).toEqual([]);
        expect(out.geo.byCity).toEqual([]);
        expect(out.roles).toEqual([]);
        expect(out.recent).toEqual([]);
    });
});