"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

const COLORS = ["#f59e0b", "#0ea5e9", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export function RoleDistribution({ data }: { data: DashboardPayload["roles"] }) {
    const rows = data.map((d) => ({
        name: d.role === "—" ? "Unspecified" : (ROLE_LABELS[d.role as UserRole] ?? d.role),
        value: d.count,
    }));

    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Roles</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
                {rows.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                        No data
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={rows}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={80}
                                innerRadius={40}
                            >
                                {rows.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}