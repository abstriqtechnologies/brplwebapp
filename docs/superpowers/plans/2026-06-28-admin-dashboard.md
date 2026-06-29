# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `/admin/dashboard` page with an interactive dashboard that surfaces KPI cards, registration trends (day/month/year), coupon usage (table + bar chart), geo breakdown, role distribution, and recent activity — all driven by a single new API endpoint and a global date-range + granularity filter.

**Architecture:** One new server endpoint `GET /api/admin/dashboard` aggregates Mongo data via Mongoose `aggregate` pipelines and returns a single JSON payload. A new client component `DashboardClient` fetches the payload and renders focused widget subcomponents. Global filter (granularity + date range) re-triggers a single fetch; charts use `recharts` (already installed).

**Tech Stack:** Next.js 14 App Router, Mongoose 9, recharts 2.15, Radix UI primitives, Tailwind 3.4, Vitest 4.

## Global Constraints

- **Reuse existing patterns:** `withRequest(withAdmin(...))` for the route, `api.get<T>` from `@/apihelper/api` for client calls, `Card`/`Table`/`Select`/`Popover`+`Calendar` from `@/components/ui`, Tailwind classes consistent with the players page (e.g. `bg-white dark:bg-slate-900`, `text-slate-700`, `border-slate-200`).
- **Server-only modules must be safe under vitest:** the aggregation module must NOT import `server-only` or the connected Mongoose model — it must accept plain arrays of users/coupons so unit tests can pass in fixtures.
- **No new runtime dependencies.** recharts, Radix UI, date-fns, lucide-react, clsx are all already installed.
- **Naming:** kebab-case for new files in `app/api/admin/dashboard/` and `components/admin/dashboard/widgets/`. Type names PascalCase (`DashboardResponse`, `KpiTotals`, `CouponRow`).
- **Auth:** the new endpoint requires admin session (reuse `withAdmin`).
- **Empty data must render gracefully:** zero counts → `0`, empty arrays → empty-state copy in tables and "No data" in charts.

---

## File Structure

**New files:**
- `src/app/api/admin/dashboard/route.ts` — `GET` handler with admin auth.
- `src/lib/infra/db/dashboard-aggregations.ts` — pure functions: `(users, coupons, opts) => DashboardPayload`.
- `src/components/admin/dashboard/DashboardClient.tsx` — top-level orchestrator + filter state.
- `src/components/admin/dashboard/widgets/KpiCards.tsx` — 5 KPI tiles.
- `src/components/admin/dashboard/widgets/RegistrationTrendChart.tsx` — recharts line chart.
- `src/components/admin/dashboard/widgets/RoleDistribution.tsx` — recharts pie chart.
- `src/components/admin/dashboard/widgets/CouponUsageSection.tsx` — bar chart + sortable table.
- `src/components/admin/dashboard/widgets/GeoBreakdown.tsx` — horizontal bar chart.
- `src/components/admin/dashboard/widgets/RecentActivity.tsx` — compact table (max 10 rows).
- `src/components/admin/dashboard/widgets/GranularityToggle.tsx` — 3-segment control.
- `src/components/admin/dashboard/widgets/DateRangePicker.tsx` — extracted from players page for reuse.
- `src/components/admin/dashboard/widgets/DashboardSkeleton.tsx` — loading state.
- `tests/dashboard-aggregations.test.ts` — unit tests for the aggregation module.

**Modified files:**
- `src/app/(admin)/admin/dashboard/page.tsx` — replaced (render `DashboardClient`).
- `src/app/(admin)/admin/players/page.tsx` — drop its inline `DateRangePicker` (now imported from `widgets/DateRangePicker.tsx`).

---

## Task 1: Aggregation types + pure helpers

**Files:**
- Create: `src/lib/infra/db/dashboard-aggregations.ts`
- Test: `tests/dashboard-aggregations.test.ts`

**Interfaces:**
- Consumes: `IUser[]`, `ICoupon[]`, `DashboardQuery`
- Produces: `DashboardPayload` (matches the API response shape; see spec)

**Why pure:** keeps the module unit-testable with in-memory fixtures, no MongoDB.

- [ ] **Step 1: Write failing test for empty inputs**

```ts
// tests/dashboard-aggregations.test.ts
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
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm test -- tests/dashboard-aggregations.test.ts`
Expected: FAIL with "Cannot find module '@/lib/infra/db/dashboard-aggregations'"

- [ ] **Step 3: Implement the module with types + empty-input behaviour**

```ts
// src/lib/infra/db/dashboard-aggregations.ts

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
        byCity: Array<{ city: string; state: string; count: number }>;
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

export function computeDashboard(
    users: IUser[],
    coupons: ICoupon[],
    q: DashboardQuery,
): DashboardPayload {
    const inRange = users.filter((u) => {
        const d = new Date((u as { createdAt: Date | string }).createdAt);
        return d >= q.from && d <= q.to;
    });

    const totals = {
        totalPlayers: users.length,
        registeredPlayers: users.filter((u) => u.paymentStatus === "completed").length,
        pendingPayments: users.filter((u) => u.paymentStatus === "pending").length,
        trialCompleted: users.filter((u) => u.Trial_status === "completed").length,
        conversionRate: users.length === 0 ? 0 : users.filter((u) => u.paymentStatus === "completed").length / users.length,
        trialCompletionRate: users.length === 0 ? 0 : users.filter((u) => u.Trial_status === "completed").length / users.length,
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
        const key = bucketKey(new Date((u as { createdAt: Date | string }).createdAt), g);
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
                id: c ? String((c as { _id: unknown })._id) : code,
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
    const cityCount = new Map<string, { state: string; count: number }>();
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
        .slice(0, 10)
        .map(({ state, city, count }) => ({ state, city, count }));
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
        .sort(
            (a, b) =>
                new Date((b as { createdAt: Date | string }).createdAt).getTime() -
                new Date((a as { createdAt: Date | string }).createdAt).getTime(),
        )
        .slice(0, 10)
        .map((u) => ({
            id: String((u as { _id: unknown })._id),
            name: u.name?.trim() || "—",
            phone: u.phone || "—",
            paymentStatus: (u.paymentStatus as "pending" | "completed") || "pending",
            registeredAt: new Date((u as { createdAt: Date | string }).createdAt).toISOString(),
        }));
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `npm test -- tests/dashboard-aggregations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/infra/db/dashboard-aggregations.ts tests/dashboard-aggregations.test.ts
git commit -m "feat(dashboard): add pure aggregation module with empty-input coverage"
```

---

## Task 2: Aggregation test fixtures (multi-user, multi-coupon)

**Files:**
- Modify: `tests/dashboard-aggregations.test.ts`

**Why:** pins down the bucket math, coupon join, geo aggregation, recent sorting, and totals.

- [ ] **Step 1: Add the fixtures test block**

Append to `tests/dashboard-aggregations.test.ts`:

```ts
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

describe("computeDashboard — populated inputs", () => {
    const from = new Date("2026-06-01T00:00:00Z");
    const to = new Date("2026-06-30T23:59:59Z");

    it("totals reflect all users, not just in-range", () => {
        const users = [
            makeUser({ createdAt: new Date("2026-01-01"), paymentStatus: "completed" }),
            makeUser({ createdAt: new Date("2026-06-10"), paymentStatus: "pending" }),
            makeUser({ createdAt: new Date("2026-06-20"), paymentStatus: "completed", Trial_status: "completed" }),
        ];
        const out = computeDashboard(users, [], { from, to, granularity: "day" });
        expect(out.totals.totalPlayers).toBe(3);
        expect(out.totals.registeredPlayers).toBe(2);
        expect(out.totals.pendingPayments).toBe(1);
        expect(out.totals.trialCompleted).toBe(1);
        expect(out.totals.conversionRate).toBeCloseTo(2 / 3);
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
            makeCoupon({ code: "WELCOME10", type: "percent", amount: 10, usageLimit: 100, source: "manual", usedCount: 5 }),
            makeCoupon({ code: "REF5", type: "flat", amount: 50, usageLimit: 0, source: "referral", usedCount: 2 }),
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
        expect(out.coupons.topByUsage[0]).toEqual({ code: "WELCOME10", used: 2 });
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
```

- [ ] **Step 2: Run tests — expect all pass**

Run: `npm test -- tests/dashboard-aggregations.test.ts`
Expected: 6 tests pass (1 empty + 5 populated).

- [ ] **Step 3: Commit**

```bash
git add tests/dashboard-aggregations.test.ts
git commit -m "test(dashboard): cover aggregation across totals, buckets, coupons, geo, recent"
```

---

## Task 3: New API endpoint

**Files:**
- Create: `src/app/api/admin/dashboard/route.ts`

**Interfaces:**
- Consumes: query string `from` (ISO), `to` (ISO), `granularity` (day|month|year)
- Produces: `ok({ ...DashboardPayload })` or 400 on bad params

- [ ] **Step 1: Implement the route**

```ts
// src/app/api/admin/dashboard/route.ts
/**
 * `/api/admin/dashboard` — single endpoint that powers the interactive
 * admin dashboard. Accepts a date range and granularity; aggregates the
 * User and Coupon collections and returns the full payload.
 *
 * Query params:
 *   - from: ISO date (inclusive). Defaults to "now - 6 months".
 *   - to:   ISO date (inclusive end-of-day). Defaults to "now".
 *   - granularity: "day" | "month" | "year". Defaults to "month".
 */

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Coupon from "@/models/Coupon";
import AdminUser from "@/models/AdminUser";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok, BadRequestError } from "@/lib/api/response";
import { getAdminCookie } from "@/lib/auth/cookies";
import {
    computeDashboard,
    type Granularity,
    type DashboardPayload,
} from "@/lib/infra/db/dashboard-aggregations";
import type { IAdminUser } from "@/models/AdminUser";
import type { IUser } from "@/models/User";
import type { ICoupon } from "@/models/Coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_GRANULARITIES: Granularity[] = ["day", "month", "year"];

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    return (await AdminUser.findById(id).lean()) as unknown as IAdminUser | null;
}

function parseDate(v: string | null, fallback: Date): Date {
    if (!v) return fallback;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
        throw new BadRequestError(`Invalid date: ${v}`);
    }
    return d;
}

function parseGranularity(v: string | null): Granularity {
    if (!v) return "month";
    if (!VALID_GRANULARITIES.includes(v as Granularity)) {
        throw new BadRequestError(`Invalid granularity: ${v}`);
    }
    return v as Granularity;
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
    })(async (ctx) => {
        await connectDB();
        const url = new URL(ctx.req.url);
        const now = new Date();
        const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const from = parseDate(url.searchParams.get("from"), defaultFrom);
        const to = parseDate(url.searchParams.get("to"), endOfToday);
        const granularity = parseGranularity(url.searchParams.get("granularity"));

        if (from > to) {
            throw new BadRequestError("`from` must be on or before `to`");
        }

        const [users, coupons] = await Promise.all([
            User.find({}).lean() as unknown as Promise<IUser[]>,
            Coupon.find({}).lean() as unknown as Promise<ICoupon[]>,
        ]);

        const payload: DashboardPayload = computeDashboard(users, coupons, {
            from,
            to,
            granularity,
        });

        return ok(payload);
    }),
);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-curl locally**

Start dev server in another shell: `npm run dev`
Then run: `curl -sS -b "brpl_admin=…" 'http://localhost:3000/api/admin/dashboard?granularity=month' | head -c 500`
Expected: JSON with `ok: true`, `data.range`, `data.totals.totalPlayers`. (If no admin cookie is set up, log in via the admin login flow first; an unauthenticated call returns 401.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/dashboard/route.ts
git commit -m "feat(dashboard): add /api/admin/dashboard endpoint"
```

---

## Task 4: Extract reusable DateRangePicker

**Files:**
- Create: `src/components/admin/dashboard/widgets/DateRangePicker.tsx`
- Modify: `src/app/(admin)/admin/players/page.tsx` — replace the inline picker with an import.

- [ ] **Step 1: Create the widget file**

```tsx
// src/components/admin/dashboard/widgets/DateRangePicker.tsx
"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reusable admin date-range picker. Same UX as the one previously
 * inlined in /admin/players — extracted so the dashboard can share it.
 */
export function DateRangePicker({
    value,
    onChange,
    className,
}: {
    value: DateRange | undefined;
    onChange: (range: DateRange | undefined) => void;
    className?: string;
}) {
    const fmt = (d: Date) =>
        d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const label = (() => {
        if (value?.from && value.to) return `${fmt(value.from)} – ${fmt(value.to)}`;
        if (value?.from) return `${fmt(value.from)} – …`;
        return "Date range";
    })();

    const active = Boolean(value?.from || value?.to);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center justify-between gap-1.5 h-8 w-44 px-2 text-xs rounded-md border bg-white dark:bg-slate-900",
                        "focus:outline-none focus:ring-2 focus:ring-amber-400",
                        active
                            ? "border-amber-400 text-amber-800 dark:text-amber-200"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
                        className,
                    )}
                    aria-label="Date range"
                >
                    <span className="flex items-center gap-1.5 truncate">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{label}</span>
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" numberOfMonths={2} selected={value} onSelect={onChange} initialFocus />
                {active && (
                    <div className="border-t border-slate-200 dark:border-slate-700 p-2 flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => onChange(undefined)}
                        >
                            Clear dates
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
```

- [ ] **Step 2: Update players page to import from the new location**

In `src/app/(admin)/admin/players/page.tsx`:
- Delete the inline `DateRangePicker` function (lines ~449-503).
- Add `import { DateRangePicker } from "@/components/admin/dashboard/widgets/DateRangePicker";` at the top.
- Replace `<DateRangePicker value={dateRange} onChange={setDateRange} />` usage — it stays the same call.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/dashboard/widgets/DateRangePicker.tsx src/app/\(admin\)/admin/players/page.tsx
git commit -m "refactor(admin): extract shared DateRangePicker widget"
```

---

## Task 5: GranularityToggle widget

**Files:**
- Create: `src/components/admin/dashboard/widgets/GranularityToggle.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/dashboard/widgets/GranularityToggle.tsx
"use client";

import { cn } from "@/lib/utils";
import type { Granularity } from "@/lib/infra/db/dashboard-aggregations";

const OPTIONS: Granularity[] = ["day", "month", "year"];

/** 3-segment toggle for the registration-trend granularity. */
export function GranularityToggle({
    value,
    onChange,
}: {
    value: Granularity;
    onChange: (g: Granularity) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-label="Granularity"
            className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
            {OPTIONS.map((opt) => {
                const active = opt === value;
                return (
                    <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt)}
                        className={cn(
                            "px-3 h-8 text-xs font-medium capitalize transition-colors",
                            active
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                        )}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/widgets/GranularityToggle.tsx
git commit -m "feat(dashboard): add GranularityToggle widget"
```

---

## Task 6: KpiCards widget

**Files:**
- Create: `src/components/admin/dashboard/widgets/KpiCards.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/dashboard/widgets/KpiCards.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Clock, Trophy, TrendingUp } from "lucide-react";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Totals = DashboardPayload["totals"];

const TILES: Array<{
    key: keyof Totals;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    format: (t: Totals) => string;
}> = [
    { key: "totalPlayers", label: "Total Players", icon: Users, format: (t) => formatInt(t.totalPlayers) },
    {
        key: "registeredPlayers",
        label: "Registered Players",
        icon: UserCheck,
        format: (t) => formatInt(t.registeredPlayers),
    },
    {
        key: "pendingPayments",
        label: "Pending Payments",
        icon: Clock,
        format: (t) => formatInt(t.pendingPayments),
    },
    {
        key: "trialCompleted",
        label: "Trial Completed",
        icon: Trophy,
        format: (t) => formatInt(t.trialCompleted),
    },
    {
        key: "conversionRate",
        label: "Conversion Rate",
        icon: TrendingUp,
        format: (t) => `${(t.conversionRate * 100).toFixed(1)}%`,
    },
];

export function KpiCards({ totals }: { totals: Totals }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {TILES.map(({ key, label, icon: Icon, format }) => (
                <Card key={key} className="border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                            {format(totals)}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function formatInt(n: number): string {
    return n.toLocaleString("en-IN");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/widgets/KpiCards.tsx
git commit -m "feat(dashboard): add KpiCards widget"
```

---

## Task 7: RegistrationTrendChart widget

**Files:**
- Create: `src/components/admin/dashboard/widgets/RegistrationTrendChart.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/dashboard/widgets/RegistrationTrendChart.tsx
"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Props = {
    data: DashboardPayload["registrations"];
    granularity: DashboardPayload["range"]["granularity"];
};

export function RegistrationTrendChart({ data, granularity }: Props) {
    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    Registration trend ({granularity})
                </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        No registrations in range
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    fontSize: 12,
                                    borderRadius: 6,
                                    border: "1px solid #e2e8f0",
                                }}
                                formatter={(v: number) => [v.toLocaleString("en-IN"), "Registrations"]}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "#f59e0b" }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/widgets/RegistrationTrendChart.tsx
git commit -m "feat(dashboard): add RegistrationTrendChart widget"
```

---

## Task 8: RoleDistribution widget

**Files:**
- Create: `src/components/admin/dashboard/widgets/RoleDistribution.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/dashboard/widgets/RoleDistribution.tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

const COLORS = ["#f59e0b", "#0ea5e9", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export function RoleDistribution({ data }: { data: DashboardPayload["roles"] }) {
    const rows = data.map((d) => ({
        name: d.role === "—" ? "Unspecified" : (ROLE_LABELS[d.role as UserRole] ?? d.role),
        value: d.count,
    }));

    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Roles</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
                {rows.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        No data
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={rows} dataKey="value" nameKey="name" outerRadius={80} innerRadius={40}>
                                {rows.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/widgets/RoleDistribution.tsx
git commit -m "feat(dashboard): add RoleDistribution widget"
```

---

## Task 9: CouponUsageSection widget (table + bar chart)

**Files:**
- Create: `src/components/admin/dashboard/widgets/CouponUsageSection.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/dashboard/widgets/CouponUsageSection.tsx
"use client";

import { useMemo, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import { ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Row = DashboardPayload["coupons"]["rows"][number];

const PAGE_SIZE = 10;

export function CouponUsageSection({ data }: { data: DashboardPayload["coupons"] }) {
    const [sortKey, setSortKey] = useState<keyof Row>("usedCount");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const rows = useMemo(() => {
        const copy = [...data.rows];
        copy.sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
            return sortDir === "asc" ? cmp : -cmp;
        });
        return copy;
    }, [data.rows, sortKey, sortDir]);

    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const toggleSort = (key: keyof Row) => {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    return (
        <div className="space-y-3">
            <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Top coupons by usage</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                    {data.topByUsage.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-slate-400">
                            No coupon usage in range
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data.topByUsage}
                                layout="vertical"
                                margin={{ top: 4, right: 16, bottom: 0, left: 16 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                                <YAxis
                                    type="category"
                                    dataKey="code"
                                    tick={{ fontSize: 11 }}
                                    stroke="#94a3b8"
                                    width={100}
                                />
                                <Tooltip
                                    contentStyle={{ fontSize: 12, borderRadius: 6 }}
                                    formatter={(v: number) => [v, "Uses"]}
                                />
                                <Bar dataKey="used" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">All coupons</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-auto max-h-[420px]">
                        <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                <tr className="text-left">
                                    {[
                                        { k: "code", label: "Code" },
                                        { k: "type", label: "Type" },
                                        { k: "amount", label: "Amount" },
                                        { k: "usedCount", label: "Used" },
                                        { k: "usageLimit", label: "Limit" },
                                        { k: "source", label: "Source" },
                                    ].map(({ k, label }) => (
                                        <th
                                            key={k}
                                            className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700 cursor-pointer select-none"
                                            onClick={() => toggleSort(k as keyof Row)}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {label}
                                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                                            No coupons found.
                                        </td>
                                    </tr>
                                ) : (
                                    pageRows.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 font-mono text-xs">
                                                {r.code}
                                            </td>
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 capitalize">
                                                {r.type}
                                            </td>
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 tabular-nums">
                                                {r.type === "percent" ? `${r.amount}%` : `₹${r.amount}`}
                                            </td>
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 tabular-nums font-semibold">
                                                {r.usedCount}
                                            </td>
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 tabular-nums">
                                                {r.usageLimit === 0 ? "∞" : r.usageLimit}
                                            </td>
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                                                <SourceBadge source={r.source} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                            <span>
                                Page {safePage} of {totalPages} · {rows.length} coupon{rows.length === 1 ? "" : "s"}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className={cn("px-2 h-7 rounded-md border", "border-slate-200 dark:border-slate-700")}
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    className={cn("px-2 h-7 rounded-md border", "border-slate-200 dark:border-slate-700")}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function SourceBadge({ source }: { source: "manual" | "referral" }) {
    const isReferral = source === "referral";
    return (
        <span
            className={cn(
                "inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full",
                isReferral
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
            )}
        >
            {source}
        </span>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/widgets/CouponUsageSection.tsx
git commit -m "feat(dashboard): add CouponUsageSection (bar + sortable table)"
```

---

## Task 10: GeoBreakdown widget

**Files:**
- Create: `src/components/admin/dashboard/widgets/GeoBreakdown.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/dashboard/widgets/GeoBreakdown.tsx
"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

export function GeoBreakdown({ data }: { data: DashboardPayload["geo"] }) {
    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top states</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
                {data.byState.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        No geographic data
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data.byState}
                            layout="vertical"
                            margin={{ top: 4, right: 16, bottom: 0, left: 16 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                            <YAxis
                                type="category"
                                dataKey="state"
                                tick={{ fontSize: 11 }}
                                stroke="#94a3b8"
                                width={80}
                            />
                            <Tooltip
                                contentStyle={{ fontSize: 12, borderRadius: 6 }}
                                formatter={(v: number) => [v, "Players"]}
                            />
                            <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/widgets/GeoBreakdown.tsx
git commit -m "feat(dashboard): add GeoBreakdown widget"
```

---

## Task 11: RecentActivity widget

**Files:**
- Create: `src/components/admin/dashboard/widgets/RecentActivity.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/dashboard/widgets/RecentActivity.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Row = DashboardPayload["recent"][number];

export function RecentActivity({ rows }: { rows: DashboardPayload["recent"] }) {
    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {rows.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">No recent registrations</div>
                ) : (
                    <div className="overflow-auto max-h-[420px]">
                        <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                <tr className="text-left">
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Name</th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Phone</th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Payment</th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Registered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                            {r.name}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 font-mono text-xs whitespace-nowrap">
                                            {r.phone}
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                            <PaymentBadge status={r.paymentStatus} />
                                        </td>
                                        <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                            {formatDate(r.registeredAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function PaymentBadge({ status }: { status: Row["paymentStatus"] }) {
    const ok = status === "completed";
    return (
        <span
            className={cn(
                "inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full",
                ok
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
            )}
        >
            {ok ? "Paid" : "Pending"}
        </span>
    );
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/widgets/RecentActivity.tsx
git commit -m "feat(dashboard): add RecentActivity widget"
```

---

## Task 12: DashboardSkeleton widget

**Files:**
- Create: `src/components/admin/dashboard/widgets/DashboardSkeleton.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/dashboard/widgets/DashboardSkeleton.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";

export function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-4 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="border-slate-200 dark:border-slate-800">
                        <CardContent className="p-4 space-y-2">
                            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/widgets/DashboardSkeleton.tsx
git commit -m "feat(dashboard): add loading skeleton"
```

---

## Task 13: DashboardClient orchestrator

**Files:**
- Create: `src/components/admin/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/dashboard/DashboardClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/apihelper/api";
import {
    computeDashboard as _ignore, // ensures type-only import path; see below
    type DashboardPayload,
    type Granularity,
} from "@/lib/infra/db/dashboard-aggregations";
import { KpiCards } from "./widgets/KpiCards";
import { RegistrationTrendChart } from "./widgets/RegistrationTrendChart";
import { RoleDistribution } from "./widgets/RoleDistribution";
import { CouponUsageSection } from "./widgets/CouponUsageSection";
import { GeoBreakdown } from "./widgets/GeoBreakdown";
import { RecentActivity } from "./widgets/RecentActivity";
import { GranularityToggle } from "./widgets/GranularityToggle";
import { DateRangePicker } from "./widgets/DateRangePicker";
import { DashboardSkeleton } from "./widgets/DashboardSkeleton";

// `computeDashboard` is server-only; this file must only consume the type.
// Remove the unused-import shim once eslint is configured to ignore it.
void _ignore;

function defaultRange(): DateRange {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    return { from, to: now };
}

function rangeToParams(range: DateRange | undefined, granularity: Granularity): URLSearchParams {
    const params = new URLSearchParams({ granularity });
    if (range?.from) params.set("from", range.from.toISOString());
    if (range?.to) {
        const endOfDay = new Date(range.to);
        endOfDay.setHours(23, 59, 59, 999);
        params.set("to", endOfDay.toISOString());
    }
    return params;
}

export function DashboardClient() {
    const [granularity, setGranularity] = useState<Granularity>("month");
    const [range, setRange] = useState<DateRange | undefined>(defaultRange);
    const [data, setData] = useState<DashboardPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const params = rangeToParams(range, granularity);
        const res = await api.get<{ ok: true; data: DashboardPayload }>(
            `/api/admin/dashboard?${params.toString()}`,
        );
        if (res.ok && res.data?.ok) {
            setData(res.data.data);
        } else {
            setError(res.error || "Failed to load dashboard");
        }
        setLoading(false);
    }, [granularity, range]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const filtersActive = useMemo(
        () =>
            Boolean(range?.from || range?.to) ||
            granularity !== "month",
        [range, granularity],
    );

    const clearFilters = () => {
        setGranularity("month");
        setRange(defaultRange());
    };

    return (
        <main className="p-6 min-w-0 space-y-4">
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Live overview of registrations, coupons, and players.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <GranularityToggle value={granularity} onChange={setGranularity} />
                    <DateRangePicker value={range} onChange={setRange} />
                    {filtersActive && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={clearFilters}
                        >
                            Clear
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => void fetchData()}
                        disabled={loading}
                        aria-label="Refresh dashboard"
                    >
                        <RefreshCcw className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </header>

            {error && (
                <div className="px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center justify-between">
                    <span>{error}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => void fetchData()}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {loading && !data ? (
                <DashboardSkeleton />
            ) : data ? (
                <>
                    <KpiCards totals={data.totals} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="lg:col-span-2">
                            <RegistrationTrendChart data={data.registrations} granularity={data.range.granularity} />
                        </div>
                        <RoleDistribution data={data.roles} />
                    </div>
                    <CouponUsageSection data={data.coupons} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <GeoBreakdown data={data.geo} />
                        <RecentActivity rows={data.recent} />
                    </div>
                </>
            ) : null}

            {loading && data && (
                <p className="text-xs text-slate-400">Refreshing…</p>
            )}
        </main>
    );
}
```

> **Note on the `computeDashboard as _ignore` shim:** the `DashboardClient` lives under `src/components/admin/dashboard/`, but the aggregation module is server-only-ish. We import only its **types** via `import type` — the runtime `computeDashboard as _ignore` line above is intentional to keep the module alive in the type system. **Replace that line with:** `import type { DashboardPayload, Granularity } from "@/lib/infra/db/dashboard-aggregations";` and drop the `_ignore` reference, the `void _ignore` line, and the now-unused `computeDashboard` import. Final imports should be:
>
> ```ts
> import type { DashboardPayload, Granularity } from "@/lib/infra/db/dashboard-aggregations";
> ```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): wire DashboardClient with global filter and widgets"
```

---

## Task 14: Replace dashboard page entry point

**Files:**
- Modify: `src/app/(admin)/admin/dashboard/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// src/app/(admin)/admin/dashboard/page.tsx
"use client";

import { DashboardClient } from "@/components/admin/dashboard/DashboardClient";

export default function AdminDashboardPage() {
    return <DashboardClient />;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: all green.

- [ ] **Step 4: Manual smoke**

Start dev: `npm run dev`
Visit `http://localhost:3000/admin/dashboard`. Verify:
- 5 KPI tiles render with non-zero values (assuming data exists).
- Line chart renders with at least one point.
- Pie chart shows role legend.
- Coupons table populates; bar chart shows top 10.
- Geo bar chart shows top states.
- Recent activity shows latest registrations.
- Changing granularity or date range re-fetches and updates widgets.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(admin\)/admin/dashboard/page.tsx
git commit -m "feat(admin): wire /admin/dashboard to the new DashboardClient"
```

---

## Self-Review

- **Spec coverage:** KPI cards (Task 6), registration trend Day/Month/Year (Tasks 7 + 13), coupon usage table + bar (Task 9), global filter (Tasks 4 + 5 + 13), geo breakdown (Task 10), role distribution (Task 8), recent activity (Task 11), single API endpoint (Task 3), tests (Tasks 1 + 2). ✓
- **Placeholder scan:** none. Every step has exact code.
- **Type consistency:** `DashboardPayload` defined in Task 1, consumed by Tasks 3 (API), 6-13 (widgets), 14 (page). `Granularity` defined in Task 1, used in Tasks 3 + 5 + 13. Field names match across modules.
- **Out-of-scope confirmed:** no e2e, no export, no real-time, no prior-period delta.