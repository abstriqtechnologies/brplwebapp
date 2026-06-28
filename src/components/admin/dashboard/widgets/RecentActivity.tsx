"use client";

import { cn } from "@/lib/utils";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Row = DashboardPayload["recent"][number];

export function RecentActivity({ rows }: { rows: DashboardPayload["recent"] }) {
    return (
        <div className="relative rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 ring-1 ring-inset ring-indigo-400/20 p-0 overflow-hidden">
            <div className="p-3 pb-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Recent activity
                </h3>
            </div>
            {rows.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-400">
                    No recent registrations
                </div>
            ) : (
                <div className="overflow-auto max-h-[360px]">
                    <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-xl text-slate-600 dark:text-slate-300">
                            <tr className="text-left">
                                <th className="px-3 py-1.5 font-medium border-b border-slate-200/50 dark:border-slate-700/50">
                                    Name
                                </th>
                                <th className="px-3 py-1.5 font-medium border-b border-slate-200/50 dark:border-slate-700/50">
                                    Phone
                                </th>
                                <th className="px-3 py-1.5 font-medium border-b border-slate-200/50 dark:border-slate-700/50">
                                    Payment
                                </th>
                                <th className="px-3 py-1.5 font-medium border-b border-slate-200/50 dark:border-slate-700/50">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr
                                    key={r.id}
                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                                >
                                    <td className="px-3 py-1 border-b border-slate-100/50 dark:border-slate-800/50 whitespace-nowrap">
                                        {r.name}
                                    </td>
                                    <td className="px-3 py-1 border-b border-slate-100/50 dark:border-slate-800/50 font-mono whitespace-nowrap">
                                        {r.phone}
                                    </td>
                                    <td className="px-3 py-1 border-b border-slate-100/50 dark:border-slate-800/50 whitespace-nowrap">
                                        <PaymentBadge status={r.paymentStatus} />
                                    </td>
                                    <td className="px-3 py-1 border-b border-slate-100/50 dark:border-slate-800/50 whitespace-nowrap text-slate-500">
                                        {formatDate(r.registeredAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function PaymentBadge({ status }: { status: Row["paymentStatus"] }) {
    const ok = status === "completed";
    return (
        <span
            className={cn(
                "inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
                ok
                    ? "bg-emerald-200/60 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-amber-200/60 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
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