"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/apihelper/api";
import type { DashboardPayload, Granularity } from "@/lib/infra/db/dashboard-aggregations";
import { KpiCards } from "./widgets/KpiCards";
import { RegistrationTrendChart } from "./widgets/RegistrationTrendChart";
import { RoleDistribution } from "./widgets/RoleDistribution";
import { CouponUsageSection } from "./widgets/CouponUsageSection";
import { GeoBreakdown } from "./widgets/GeoBreakdown";
import { RecentActivity } from "./widgets/RecentActivity";
import { GranularityToggle } from "./widgets/GranularityToggle";
import { DateRangePicker } from "./widgets/DateRangePicker";
import { DashboardSkeleton } from "./widgets/DashboardSkeleton";

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
        () => Boolean(range?.from || range?.to) || granularity !== "month",
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
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                        Dashboard
                    </h1>
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
                        <RefreshCcw
                            className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")}
                        />
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
                            <RegistrationTrendChart
                                data={data.registrations}
                                granularity={data.range.granularity}
                            />
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

            {loading && data && <p className="text-xs text-slate-400">Refreshing…</p>}
        </main>
    );
}