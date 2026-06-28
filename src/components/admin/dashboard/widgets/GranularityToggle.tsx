"use client";

import { cn } from "@/lib/utils";
import type { Granularity } from "@/lib/infra/db/dashboard-aggregations";

const OPTIONS: Granularity[] = ["day", "month", "year"];

/** 3-segment toggle for the registration-trend granularity. */
export function GranularityToggle({
    value,
    onChange,
}: {
    value: Granularity;
    onChange: (g: Granularity) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-label="Granularity"
            className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
            {OPTIONS.map((opt) => {
                const active = opt === value;
                return (
                    <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt)}
                        className={cn(
                            "px-3 h-8 text-xs font-medium capitalize transition-colors",
                            active
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                        )}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}