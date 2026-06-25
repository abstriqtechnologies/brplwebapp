import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="space-y-6">
            {/* Stat cards row */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-2/3" />
                    </div>
                ))}
            </div>
            {/* Chart placeholder */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <Skeleton className="h-4 w-1/4 mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
}