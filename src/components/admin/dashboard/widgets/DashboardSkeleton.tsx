"use client";

import { cn } from "@/lib/utils";

export function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-3 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 p-3 space-y-2"
                    >
                        <div className="h-2.5 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-5 w-12 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                <div className="lg:col-span-2 rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 h-60" />
                <div className="rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 h-60" />
            </div>
            <div className="rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 h-60" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 h-60" />
                <div className="rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 h-60" />
            </div>
        </div>
    );
}