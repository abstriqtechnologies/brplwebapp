"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reusable admin date-range picker. Same UX as the one previously
 * inlined in /admin/players — extracted so the dashboard can share it.
 */
export function DateRangePicker({
    value,
    onChange,
    className,
}: {
    value: DateRange | undefined;
    onChange: (range: DateRange | undefined) => void;
    className?: string;
}) {
    const fmt = (d: Date) =>
        d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const label = (() => {
        if (value?.from && value.to) return `${fmt(value.from)} – ${fmt(value.to)}`;
        if (value?.from) return `${fmt(value.from)} – …`;
        return "Date range";
    })();

    const active = Boolean(value?.from || value?.to);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center justify-between gap-1.5 h-8 w-44 px-2 text-xs rounded-md border bg-white dark:bg-slate-900",
                        "focus:outline-none focus:ring-2 focus:ring-amber-400",
                        active
                            ? "border-amber-400 text-amber-800 dark:text-amber-200"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
                        className,
                    )}
                    aria-label="Date range"
                >
                    <span className="flex items-center gap-1.5 truncate">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{label}</span>
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={value}
                    onSelect={onChange}
                    initialFocus
                />
                {active && (
                    <div className="border-t border-slate-200 dark:border-slate-700 p-2 flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => onChange(undefined)}
                        >
                            Clear dates
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}