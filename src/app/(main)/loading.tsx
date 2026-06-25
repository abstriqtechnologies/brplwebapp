/**
 * Default loading skeleton for the public site.
 *
 * Used for every route in the `(main)` group that doesn't define its own
 * `loading.tsx`. Renders a single card-like block plus a centered spinner
 * so users see feedback immediately.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-4xl space-y-6">
                <Skeleton className="h-12 w-2/3 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}