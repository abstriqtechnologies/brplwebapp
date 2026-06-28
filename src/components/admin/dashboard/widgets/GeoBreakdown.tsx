"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    LabelList,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

export function GeoBreakdown({ data }: { data: DashboardPayload["geo"] }) {
    return (
        <div className="relative rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 ring-1 ring-inset ring-emerald-400/20 p-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Top states
            </h3>
            <div className="h-36">
                {data.byState.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No geographic data
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data.byState}
                            layout="vertical"
                            margin={{ top: 2, right: 28, bottom: 0, left: 0 }}
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
                                dataKey="state"
                                tick={{ fontSize: 9 }}
                                stroke="#94a3b8"
                                tickLine={false}
                                axisLine={false}
                                width={40}
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
                                radius={[0, 3, 3, 0]}
                                barSize={10}
                            >
                                <LabelList
                                    dataKey="count"
                                    position="right"
                                    fontSize={10}
                                    fill="#059669"
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}