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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

export function GeoBreakdown({ data }: { data: DashboardPayload["geo"] }) {
    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top states</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
                {data.byState.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        No geographic data
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data.byState}
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
                                dataKey="state"
                                tick={{ fontSize: 11 }}
                                stroke="#94a3b8"
                                width={80}
                            />
                            <Tooltip
                                contentStyle={{ fontSize: 12, borderRadius: 6 }}
                                formatter={(v: number) => [v, "Players"]}
                            />
                            <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}