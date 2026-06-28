"use client";

import { Users, UserCheck, Clock, Trophy, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Totals = DashboardPayload["totals"];

const TILES: Array<{
    key: keyof Totals;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    format: (t: Totals) => string;
}> = [
    {
        key: "totalPlayers",
        label: "Total Players",
        icon: Users,
        format: (t) => formatInt(t.totalPlayers),
    },
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
                            <span className="text-xs font-medium uppercase tracking-wide">
                                {label}
                            </span>
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