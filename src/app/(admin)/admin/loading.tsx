import { Loader2 } from "lucide-react";

export default function AdminSectionLoading() {
    return (
        <main className="p-6 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="space-y-2">
                    <div className="h-7 w-36 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    <div className="h-4 w-48 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="h-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700" />
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-6 gap-4 px-3 py-3">
                            {Array.from({ length: 6 }).map((__, j) => (
                                <div key={j} className="h-4 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
