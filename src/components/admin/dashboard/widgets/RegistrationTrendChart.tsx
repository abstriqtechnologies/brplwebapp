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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

type Props = {
    data: DashboardPayload["registrations"];
    granularity: DashboardPayload["range"]["granularity"];
};

export function RegistrationTrendChart({ data, granularity }: Props) {
    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    Registration trend ({granularity})
                </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        No registrations in range
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                stroke="#94a3b8"
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    fontSize: 12,
                                    borderRadius: 6,
                                    border: "1px solid #e2e8f0",
                                }}
                                formatter={(v: number) => [
                                    v.toLocaleString("en-IN"),
                                    "Registrations",
                                ]}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "#f59e0b" }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}