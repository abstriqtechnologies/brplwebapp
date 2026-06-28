"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";
import type { DashboardPayload } from "@/lib/infra/db/dashboard-aggregations";

const COLORS = ["#f59e0b", "#0ea5e9", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export function RoleDistribution({ data }: { data: DashboardPayload["roles"] }) {
    const rows = data.map((d) => ({
        name: d.role === "—" ? "Unspecified" : (ROLE_LABELS[d.role as UserRole] ?? d.role),
        value: d.count,
    }));

    return (
        <div className="relative rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 ring-1 ring-inset ring-violet-400/20 p-3 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Roles
            </h3>
            <div className="flex-1 min-h-0">
                {rows.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No data
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={rows}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={68}
                                innerRadius={34}
                                paddingAngle={2}
                            >
                                {rows.map((_, i) => (
                                    <Cell
                                        key={i}
                                        fill={COLORS[i % COLORS.length]}
                                        stroke="rgba(255,255,255,0.2)"
                                        strokeWidth={1}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    fontSize: 11,
                                    borderRadius: 8,
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    background: "rgba(255,255,255,0.85)",
                                    backdropFilter: "blur(12px)",
                                }}
                                formatter={(v: number, n: string) => [v.toLocaleString("en-IN"), n]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
                {rows.map((r, i) => (
                    <span
                        key={r.name}
                        className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400"
                    >
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        {r.name}
                    </span>
                ))}
            </div>
        </div>
    );
}