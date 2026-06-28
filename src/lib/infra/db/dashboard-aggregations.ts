/**
 * Pure dashboard aggregation. Given in-memory `IUser[]` and `ICoupon[]`,
 * plus a date range and granularity, return the full dashboard payload.
 *
 * Pure = no DB / no `server-only` import = trivial to unit-test with
 * fixtures. The API route loads the data from MongoDB and calls this.
 */

import type { IUser } from "@/models/User";
import type { ICoupon } from "@/models/Coupon";

export type Granularity = "day" | "month" | "year";

export type DashboardQuery = {
    from: Date;
    to: Date; // inclusive end-of-day
    granularity: Granularity;
};

export type DashboardPayload = {
    range: { from: string; to: string; granularity: Granularity };
    totals: {
        totalPlayers: number;
        registeredPlayers: number;
        pendingPayments: number;
        trialCompleted: number;
        conversionRate: number;
        trialCompletionRate: number;
    };
    registrations: Array<{ bucket: string; count: number }>;
    coupons: {
        rows: Array<{
            id: string;
            code: string;
            type: "flat" | "percent";
            amount: number;
            usageLimit: number;
            usedCount: number;
            totalUsedAllTime: number;
            source: "manual" | "referral";
            active: boolean;
        }>;
        topByUsage: Array<{ code: string; used: number }>;
    };
    geo: {
        byState: Array<{ state: string; count: number }>;
        byCity: Array<{ state: string; city: string; count: number }>;
    };
    roles: Array<{ role: string; count: number }>;
    recent: Array<{
        id: string;
        name: string;
        phone: string;
        paymentStatus: "pending" | "completed";
        registeredAt: string;
    }>;
};

function createdAtOf(u: IUser): Date {
    const c = (u as unknown as { createdAt: Date | string }).createdAt;
    return c instanceof Date ? c : new Date(c);
}

export function computeDashboard(
    users: IUser[],
    coupons: ICoupon[],
    q: DashboardQuery,
): DashboardPayload {
    const inRange = users.filter((u) => {
        const d = createdAtOf(u);
        return d >= q.from && d <= q.to;
    });

    const totalPlayers = users.length;
    const registeredPlayers = users.filter((u) => u.paymentStatus === "completed").length;
    const pendingPayments = users.filter((u) => u.paymentStatus === "pending").length;
    const trialCompleted = users.filter((u) => u.Trial_status === "completed").length;

    const totals = {
        totalPlayers,
        registeredPlayers,
        pendingPayments,
        trialCompleted,
        conversionRate: totalPlayers === 0 ? 0 : registeredPlayers / totalPlayers,
        trialCompletionRate: totalPlayers === 0 ? 0 : trialCompleted / totalPlayers,
    };

    return {
        range: {
            from: q.from.toISOString(),
            to: q.to.toISOString(),
            granularity: q.granularity,
        },
        totals,
        registrations: bucketByGranularity(inRange, q.granularity),
        coupons: aggregateCoupons(inRange, coupons),
        geo: aggregateGeo(inRange),
        roles: aggregateRoles(inRange),
        recent: aggregateRecent(inRange),
    };
}

function bucketKey(d: Date, g: Granularity): string {
    if (g === "day") {
        return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    if (g === "month") {
        return d.toISOString().slice(0, 7); // YYYY-MM
    }
    return d.toISOString().slice(0, 4); // YYYY
}

function bucketByGranularity(users: IUser[], g: Granularity): Array<{ bucket: string; count: number }> {
    const map = new Map<string, number>();
    for (const u of users) {
        const key = bucketKey(createdAtOf(u), g);
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([bucket, count]) => ({ bucket, count }));
}

function aggregateCoupons(
    users: IUser[],
    coupons: ICoupon[],
): DashboardPayload["coupons"] {
    const byCode = new Map<string, number>();
    for (const u of users) {
        const code = u.couponCode?.trim();
        if (code) byCode.set(code, (byCode.get(code) ?? 0) + 1);
    }
    const couponByCode = new Map(coupons.map((c) => [c.code, c]));
    const rows = Array.from(byCode.entries())
        .map(([code, usedCount]) => {
            const c = couponByCode.get(code);
            const source: "manual" | "referral" =
                c?.source === "referral" || (c?.description ? /^Referral:/i.test(c.description) : false)
                    ? "referral"
                    : "manual";
            return {
                id: c ? String((c as unknown as { _id: unknown })._id) : code,
                code,
                type: (c?.type ?? "percent") as "flat" | "percent",
                amount: c?.amount ?? 0,
                usageLimit: c?.usageLimit ?? 0,
                usedCount,
                totalUsedAllTime: c?.usedCount ?? usedCount,
                source,
                active: c?.active ?? true,
            };
        })
        .sort((a, b) => b.usedCount - a.usedCount);
    return {
        rows,
        topByUsage: rows.slice(0, 10).map(({ code, usedCount }) => ({ code, used: usedCount })),
    };
}

function aggregateGeo(users: IUser[]): DashboardPayload["geo"] {
    const stateCount = new Map<string, number>();
    const cityCount = new Map<string, { state: string; city: string; count: number }>();
    for (const u of users) {
        const state = (u.state ?? "").trim() || "—";
        const city = (u.city ?? "").trim() || "—";
        if (state !== "—") stateCount.set(state, (stateCount.get(state) ?? 0) + 1);
        const key = `${state}|${city}`;
        const existing = cityCount.get(key);
        if (existing) existing.count++;
        else cityCount.set(key, { state, city, count: 1 });
    }
    const byState = Array.from(stateCount.entries())
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    const byCity = Array.from(cityCount.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    return { byState, byCity };
}

function aggregateRoles(users: IUser[]): Array<{ role: string; count: number }> {
    const map = new Map<string, number>();
    for (const u of users) {
        const role = (u.role ?? "").trim() || "—";
        map.set(role, (map.get(role) ?? 0) + 1);
    }
    return Array.from(map.entries())
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count);
}

function aggregateRecent(users: IUser[]): DashboardPayload["recent"] {
    return [...users]
        .sort((a, b) => createdAtOf(b).getTime() - createdAtOf(a).getTime())
        .slice(0, 10)
        .map((u) => ({
            id: String((u as unknown as { _id: unknown })._id),
            name: u.name?.trim() || "—",
            phone: u.phone || "—",
            paymentStatus: (u.paymentStatus as "pending" | "completed") || "pending",
            registeredAt: createdAtOf(u).toISOString(),
        }));
}