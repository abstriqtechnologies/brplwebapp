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
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                        No recent registrations
                    </div>
                ) : (
                    <div className="overflow-auto max-h-[420px]">
                        <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                <tr className="text-left">
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Name
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Phone
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Payment
                                    </th>
                                    <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">
                                        Registered
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
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