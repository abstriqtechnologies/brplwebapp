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
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Props = {
    data: DashboardPayload["registrations"];
    granularity: DashboardPayload["range"]["granularity"];
};

export function RegistrationTrendChart({ data, granularity }: Props) {
    return (
        <div className="relative rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 ring-1 ring-inset ring-amber-400/20 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Registration trend ({granularity})
            </h3>
            <div className="h-48">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No registrations in range
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f080" />
                            <XAxis
                                dataKey="bucket"
                                tick={{ fontSize: 10 }}
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10 }}
                                stroke="#94a3b8"
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    fontSize: 11,
                                    borderRadius: 8,
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    background: "rgba(255,255,255,0.85)",
                                    backdropFilter: "blur(12px)",
                                }}
                                formatter={(v: number) => [
                                    v.toLocaleString("en-IN"),
                                    "Registrations",
                                ]}
                            />
                            <defs>
                                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 2, fill: "#f59e0b" }}
                                activeDot={{ r: 4, fill: "#f59e0b" }}
                                fill="url(#trendGrad)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}