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
    const [page, setPage] = useState(1);

    const rows = useMemo(() => {
        const copy = [...data.rows];
        copy.sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            const cmp =
                typeof av === "number" && typeof bv === "number"
                    ? av - bv
                    : String(av).localeCompare(String(bv));
            return sortDir === "asc" ? cmp : -cmp;
        });
        return copy;
    }, [data.rows, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const toggleSort = (key: keyof Row) => {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    return (
        <div className="space-y-3">
            <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                        Top coupons by usage
                    </CardTitle>
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
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e2e8f0"
                                    horizontal={false}
                                />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 11 }}
                                    stroke="#94a3b8"
                                    allowDecimals={false}
                                />
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
                                    {(
                                        [
                                            { k: "code", label: "Code" },
                                            { k: "type", label: "Type" },
                                            { k: "amount", label: "Amount" },
                                            { k: "usedCount", label: "Used" },
                                            { k: "usageLimit", label: "Limit" },
                                            { k: "source", label: "Source" },
                                        ] as const
                                    ).map(({ k, label }) => (
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
                                        <td
                                            colSpan={6}
                                            className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                                        >
                                            No coupons found.
                                        </td>
                                    </tr>
                                ) : (
                                    pageRows.map((r) => (
                                        <tr
                                            key={r.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 font-mono text-xs">
                                                {r.code}
                                            </td>
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 capitalize">
                                                {r.type}
                                            </td>
                                            <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 tabular-nums">
                                                {r.type === "percent"
                                                    ? `${r.amount}%`
                                                    : `₹${r.amount}`}
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
                                Page {safePage} of {totalPages} · {rows.length} coupon
                                {rows.length === 1 ? "" : "s"}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className={cn(
                                        "px-2 h-7 rounded-md border",
                                        "border-slate-200 dark:border-slate-700",
                                    )}
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    className={cn(
                                        "px-2 h-7 rounded-md border",
                                        "border-slate-200 dark:border-slate-700",
                                    )}
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