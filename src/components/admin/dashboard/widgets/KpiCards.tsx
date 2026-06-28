"use client";

import {
    Users,
    UserCheck,
    Clock,
    Trophy,
    TrendingUp,
    IndianRupee,
} from "lucide-react";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Totals = DashboardPayload["totals"];

const TILES: Array<{
    key: keyof Totals;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    format: (t: Totals) => string;
    color: string; // tailwind bg/ring for glass accent
}> = [
    {
        key: "totalPlayers",
        label: "Total Players",
        icon: Users,
        format: (t) => formatInt(t.totalPlayers),
        color: "bg-blue-500/10 ring-blue-400/30",
    },
    {
        key: "registeredPlayers",
        label: "Registered",
        icon: UserCheck,
        format: (t) => formatInt(t.registeredPlayers),
        color: "bg-emerald-500/10 ring-emerald-400/30",
    },
    {
        key: "pendingPayments",
        label: "Pending",
        icon: Clock,
        format: (t) => formatInt(t.pendingPayments),
        color: "bg-amber-500/10 ring-amber-400/30",
    },
    {
        key: "trialCompleted",
        label: "Trials Done",
        icon: Trophy,
        format: (t) => formatInt(t.trialCompleted),
        color: "bg-violet-500/10 ring-violet-400/30",
    },
    {
        key: "totalRevenue",
        label: "Revenue",
        icon: IndianRupee,
        format: (t) => `₹${formatInt(t.totalRevenue)}`,
        color: "bg-rose-500/10 ring-rose-400/30",
    },
    {
        key: "conversionRate",
        label: "Conversion",
        icon: TrendingUp,
        format: (t) => `${(t.conversionRate * 100).toFixed(1)}%`,
        color: "bg-cyan-500/10 ring-cyan-400/30",
    },
];

export function KpiCards({ totals }: { totals: Totals }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {TILES.map(({ key, label, icon: Icon, format, color }) => (
                <div
                    key={key}
                    className={[
                        "relative rounded-xl border border-white/20 dark:border-white/10",
                        "backdrop-blur-xl bg-white/70 dark:bg-slate-900/70",
                        "ring-1 ring-inset",
                        color,
                        "p-3 transition-shadow hover:shadow-md",
                    ].join(" ")}
                >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {label}
                        </span>
                        <Icon className="h-3.5 w-3.5 opacity-60" />
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {format(totals)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function formatInt(n: number): string {
    return n.toLocaleString("en-IN");
}