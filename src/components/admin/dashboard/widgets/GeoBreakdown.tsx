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
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

export function GeoBreakdown({ data }: { data: DashboardPayload["geo"] }) {
    return (
        <div className="relative rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 ring-1 ring-inset ring-emerald-400/20 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Top states
            </h3>
            <div className="h-60">
                {data.byState.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No geographic data
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data.byState}
                            layout="vertical"
                            margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f080"
                                horizontal={false}
                            />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 10 }}
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="state"
                                tick={{ fontSize: 10 }}
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                                width={60}
                            />
                            <Tooltip
                                contentStyle={{
                                    fontSize: 11,
                                    borderRadius: 8,
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    background: "rgba(255,255,255,0.85)",
                                    backdropFilter: "blur(12px)",
                                }}
                                formatter={(v: number) => [v, "Players"]}
                            />
                            <defs>
                                <linearGradient id="geoBar" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#34d399" />
                                </linearGradient>
                            </defs>
                            <Bar
                                dataKey="count"
                                fill="url(#geoBar)"
                                radius={[0, 4, 4, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}