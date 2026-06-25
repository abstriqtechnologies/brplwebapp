/**
 * fetch-based API client. Same-origin, so cookies (including admin
 * session) are sent automatically. The response is normalized to
 * `{ data, error, status, ok }` so call-sites that previously used
 * axios can switch with minimal changes.
 *
 * Phase 2.6: now wraps `@/lib/api/http-client` for retry/timeout/circuit
 * behavior. The legacy shape is preserved (callers don't need to change).
 * Errors from the http-client (UpstreamError) become `{ ok: false, error,
 * status }` just like a non-2xx response — no thrown errors.
 */

import { httpFetch, type HttpFetchOptions } from "@/lib/api/http-client";
import { UpstreamError } from "@/lib/api/errors";

type ApiResponse<T = any> = {
    data: T;
    error?: string;
    status: number;
    ok: boolean;
};

const DEFAULT_TIMEOUT_MS = 15_000;

async function request<T = any>(
    method: string,
    path: string,
    body?: any,
    init?: RequestInit
): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(init?.headers as Record<string, string> | undefined),
    };
    if (body !== undefined && !(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }
    const opts: HttpFetchOptions = {
        method,
        headers,
        // Don't retry POST/PATCH by default — Phase 1's http-client treats
        // them as non-idempotent. Caller can opt in via init.
        timeoutMs: DEFAULT_TIMEOUT_MS,
        ...init,
    };
    if (body !== undefined) {
        opts.body = body instanceof FormData ? body : JSON.stringify(body);
    }
    opts.credentials = "same-origin";
    // Honour the caller's existing `cache: "no-store"` (http-client doesn't
    // set cache by default, which is what we want).

    try {
        const data = await httpFetch<T>(path, opts);
        return { data: data as T, status: 200, ok: true };
    } catch (err) {
        if (err instanceof UpstreamError) {
            const details = err.details as { status?: number } | undefined;
            return {
                data: null as any,
                error: err.message,
                status: details?.status ?? 0,
                ok: false,
            };
        }
        return {
            data: null as any,
            error: (err as Error).message || "Network error",
            status: 0,
            ok: false,
        };
    }
}

export const api = {
    get: <T = any>(path: string, init?: RequestInit) => request<T>("GET", path, undefined, init),
    post: <T = any>(path: string, body?: any, init?: RequestInit) =>
        request<T>("POST", path, body, init),
    put: <T = any>(path: string, body?: any, init?: RequestInit) =>
        request<T>("PUT", path, body, init),
    patch: <T = any>(path: string, body?: any, init?: RequestInit) =>
        request<T>("PATCH", path, body, init),
    delete: <T = any>(path: string, init?: RequestInit) => request<T>("DELETE", path, undefined, init),
};

export default api;