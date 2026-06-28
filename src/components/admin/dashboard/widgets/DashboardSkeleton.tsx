"use client";

import { Card, CardContent } from "@/components/ui/card";

export function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-4 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="border-slate-200 dark:border-slate-800">
                        <CardContent className="p-4 space-y-2">
                            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72" />
            </div>
        </div>
    );
}