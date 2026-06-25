"use client";

/**
 * Route-level error boundary for the admin section.
 *
 * Admins see a more diagnostic error page with the digest prominently
 * displayed — these errors are rarer and likely operational issues worth
 * investigating.
 */

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.error("[admin-error]", error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900 mb-4">
                    <span className="text-2xl text-red-600 dark:text-red-400" aria-hidden>
                        !
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Admin error
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                    An error occurred in the admin panel. The issue has been logged.
                </p>
                {error.digest && (
                    <p className="text-xs text-slate-400 font-mono mb-6 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded inline-block">
                        Reference: <span className="font-bold">{error.digest}</span>
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
                        href="/admin/dashboard"
                        className="border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold px-5 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}