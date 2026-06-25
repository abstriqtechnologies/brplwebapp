"use client";

/**
 * React hook wrapping `fetchJson` from `@/lib/api/cache`.
 *
 * Replaces the `useState` + `useEffect` + manual loading/error flags that
 * most admin pages use today. Returns:
 *   - `data`: the parsed (and schema-validated) response, or `null`
 *   - `error`: a tagged error envelope, or `null`
 *   - `loading`: true while a request is in flight
 *   - `refetch()`: trigger a fresh request bypassing the cache
 *
 * The cache TTL and the optional zod schema are passed straight through.
 *
 * NOTE: This hook is intentionally minimal. We don't use React Testing
 * Library in this project, so the underlying logic in `@/lib/api/cache`
 * is fully tested instead — the hook is a thin adapter that any React
 * project would write the same way.
 */

import { useCallback, useEffect, useState } from "react";
import { fetchJson, type FetchJsonOptions, type FetchResult } from "@/lib/api/cache";

export type UseFetchResult<T> = {
    data: T | null;
    error: FetchResult<unknown>["error"];
    loading: boolean;
    refetch: () => Promise<void>;
};

export function useFetch<T = unknown>(
    url: string | null,
    options: Omit<FetchJsonOptions, "method" | "body"> & { deps?: unknown[] } = {},
): UseFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<FetchResult<unknown>["error"]>(null);
    const [loading, setLoading] = useState<boolean>(url !== null);

    const { ttlMs, schema, deps, ...init } = options;

    const run = useCallback(
        async (skipCache: boolean) => {
            if (!url) {
                setLoading(false);
                return;
            }
            setLoading(true);
            const result = await fetchJson<T>(url, {
                ...(init as Omit<FetchJsonOptions, "ttlMs" | "schema">),
                ...(skipCache ? { ttlMs: 0 } : {}),
                ...(ttlMs !== undefined ? { ttlMs } : {}),
                ...(schema ? { schema } : {}),
            });
            setData(result.data);
            setError(result.error);
            setLoading(false);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [url, ttlMs, schema, ...(deps ?? []), ...Object.values(init)],
    );

    useEffect(() => {
        void run(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    const refetch = useCallback(() => run(true), [run]);

    return { data, error, loading, refetch };
}
