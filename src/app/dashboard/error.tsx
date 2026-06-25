"use client";

/**
 * Route-level error boundary for `/dashboard`.
 *
 * Distinct from `(main)/error.tsx` because the dashboard has a logout
 * option — users here are authenticated, and an unrecoverable error should
 * offer them a way out without losing their session state.
 */

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.error("[dashboard-error]", error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900 mb-4">
                    <span className="text-2xl text-red-600 dark:text-red-400" aria-hidden>
                        !
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Dashboard error
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    We hit an error loading your dashboard.
                </p>
                {error.digest && (
                    <p className="text-xs text-slate-400 font-mono mb-6">
                        Reference: {error.digest}
                    </p>
                )}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-5 py-2 rounded-full"
                    >
                        Try again
                    </button>
                    <Link
                        href="/api/auth/logout"
                        className="border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold px-5 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        Log out
                    </Link>
                </div>
            </div>
        </div>
    );
}