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
import { cn } from "@/lib/utils";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Row = DashboardPayload["coupons"]["rows"][number];

const PAGE_SIZE = 10;

/** Compact horizontal bar chart of the top-10 coupons by usage. */
export function CouponBarChart({ data }: { data: DashboardPayload["coupons"] }) {
    return (
        <div className="relative rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 ring-1 ring-inset ring-sky-400/20 p-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Top coupons by usage
            </h3>
            <div className="h-36">
                {data.topByUsage.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No coupon usage in range
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data.topByUsage}
                            layout="vertical"
                            margin={{ top: 2, right: 4, bottom: 0, left: 0 }}
                            barCategoryGap={4}
                        >
                            <XAxis
                                type="number"
                                tick={{ fontSize: 9 }}
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="code"
                                tick={{ fontSize: 9 }}
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                                width={60}
                            />
                            <Tooltip
                                contentStyle={{
                                    fontSize: 10,
                                    borderRadius: 6,
                                    padding: "4px 8px",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    background: "rgba(255,255,255,0.85)",
                                    backdropFilter: "blur(12px)",
                                }}
                                formatter={(v: number) => [v, "Uses"]}
                            />
                            <defs>
                                <linearGradient id="couponBar" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#0ea5e9" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                            </defs>
                            <Bar
                                dataKey="used"
                                fill="url(#couponBar)"
                                radius={[0, 3, 3, 0]}
                                barSize={10}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

/** Full sortable, paginated coupon table. */
export function CouponTable({ data }: { data: DashboardPayload["coupons"] }) {
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
        <div className="relative rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 ring-1 ring-inset ring-sky-400/20 p-0 overflow-hidden">
            <div className="overflow-auto max-h-[320px]">
                <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-xl text-slate-600 dark:text-slate-300">
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
                                    className="px-2.5 py-1.5 font-medium border-b border-slate-200/50 dark:border-slate-700/50 cursor-pointer select-none"
                                    onClick={() => toggleSort(k as keyof Row)}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {label}
                                        <ArrowUpDown className="h-2.5 w-2.5 opacity-40" />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                                    No coupons found.
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((r) => (
                                <tr
                                    key={r.id}
                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                                >
                                    <td className="px-2.5 py-1.5 border-b border-slate-100/50 dark:border-slate-800/50 font-mono">
                                        {r.code}
                                    </td>
                                    <td className="px-2.5 py-1.5 border-b border-slate-100/50 dark:border-slate-800/50 capitalize">
                                        {r.type}
                                    </td>
                                    <td className="px-2.5 py-1.5 border-b border-slate-100/50 dark:border-slate-800/50 tabular-nums">
                                        {r.type === "percent" ? `${r.amount}%` : `₹${r.amount}`}
                                    </td>
                                    <td className="px-2.5 py-1.5 border-b border-slate-100/50 dark:border-slate-800/50 tabular-nums font-semibold">
                                        {r.usedCount}
                                    </td>
                                    <td className="px-2.5 py-1.5 border-b border-slate-100/50 dark:border-slate-800/50 tabular-nums">
                                        {r.usageLimit === 0 ? "∞" : r.usageLimit}
                                    </td>
                                    <td className="px-2.5 py-1.5 border-b border-slate-100/50 dark:border-slate-800/50">
                                        <SourceBadge source={r.source} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-500">
                    <span>
                        Page {safePage}/{totalPages} · {rows.length} coupon
                        {rows.length === 1 ? "" : "s"}
                    </span>
                    <div className="flex gap-1.5">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className={cn(
                                "px-2 h-6 rounded-md border text-[10px]",
                                "border-slate-200/50 dark:border-slate-700/50 disabled:opacity-30",
                            )}
                        >
                            Prev
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            className={cn(
                                "px-2 h-6 rounded-md border text-[10px]",
                                "border-slate-200/50 dark:border-slate-700/50 disabled:opacity-30",
                            )}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function SourceBadge({ source }: { source: "manual" | "referral" }) {
    const isReferral = source === "referral";
    return (
        <span
            className={cn(
                "inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
                isReferral
                    ? "bg-purple-200/60 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    : "bg-sky-200/60 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
            )}
        >
            {source}
        </span>
    );
}