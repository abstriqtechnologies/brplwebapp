/**
 * Pure data fetcher + in-memory cache.
 *
 * The React hook `useFetch` (in `@/hooks/use-fetch.ts`) wraps this module.
 * Testing the pure module avoids the need for React Testing Library.
 *
 * - Sends `credentials: "same-origin"` so the admin cookie is included.
 * - JSON by default; FormData passes through untouched.
 * - Caches successful responses by URL for `ttlMs` (default 30s).
 * - Errors are NOT cached — failed requests retry on the next call.
 * - Optional `schema` (zod) validates the response before returning data.
 *
 * Errors are returned as a tagged envelope `{ status, message, code?, details? }`,
 * NOT thrown — callers (especially React hooks) prefer to branch on `error`
 * rather than wrap in try/catch.
 */

import type { ZodSchema } from "zod";

export type FetchJsonOptions = RequestInit & {
    /** TTL for the in-memory cache, in ms. 0 disables caching. Default: 30 000. */
    ttlMs?: number;
    /** When provided, the parsed body is validated against this schema. */
    schema?: ZodSchema<unknown>;
};

export type FetchError = {
    status: number;
    message: string;
    code?: string;
    details?: unknown;
};

export type FetchResult<T> = {
    data: T | null;
    error: FetchError | null;
};

const DEFAULT_TTL_MS = 30_000;

type CacheEntry = { expiresAt: number; data: unknown };
const cache = new Map<string, CacheEntry>();

/** Test helper — clear the entire cache. */
export function _resetCache(): void {
    cache.clear();
}

/** Test helper — manually invalidate a single URL. */
export function invalidate(url: string, init?: RequestInit): void {
    cache.delete(cacheKey(url, init));
}

function cacheKey(url: string, init?: RequestInit): string {
    // Different methods / bodies produce different entries.
    const method = (init?.method ?? "GET").toUpperCase();
    const bodyKey = init?.body ? JSON.stringify(init.body) : "";
    return `${method}::${url}::${bodyKey}`;
}

function lowerCaseKeys(input: Record<string, string> | undefined): Record<string, string> {
    if (!input) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(input)) {
        out[k.toLowerCase()] = v;
    }
    return out;
}

/**
 * Make a fetch call and parse the JSON response.
 *
 * Returns `{ data, error }` — never throws for HTTP errors or network
 * failures. Throws only on programmer errors (e.g. invalid URL).
 */
export async function fetchJson<T = unknown>(url: string, options: FetchJsonOptions = {}): Promise<FetchResult<T>> {
    const { ttlMs = DEFAULT_TTL_MS, schema, ...init } = options;

    // Cache lookup (GETs only by default; non-GET always goes to network).
    const method = (init.method ?? "GET").toUpperCase();
    const key = cacheKey(url, options);
    if (method === "GET" && ttlMs > 0) {
        const hit = cache.get(key);
        if (hit && hit.expiresAt > Date.now()) {
            return { data: hit.data as T, error: null };
        }
    }

    // HTTP header names are case-insensitive. We use lowercase keys here
    // so callers can pass any casing in their init.headers and our content-type
    // checks (`contentType.includes("application/json")`) work consistently.
    const headers: Record<string, string> = {
        accept: "application/json",
        ...lowerCaseKeys(init.headers as Record<string, string> | undefined),
    };
    if (init.body !== undefined && !(init.body instanceof FormData)) {
        headers["content-type"] = "application/json";
        if (typeof init.body !== "string") {
            init.body = JSON.stringify(init.body);
        }
    }
    init.credentials = "same-origin";
    init.headers = headers;

    let res: Response;
    try {
        res = await fetch(url, init);
    } catch (err) {
        return {
            data: null,
            error: {
                status: 0,
                message: (err as Error).message ?? "Network error",
            },
        };
    }

    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) {
        // Surface the project's standard `{ ok, code, message, requestId }` envelope
        // when present, falling back to a generic message.
        let parsed: any = null;
        try {
            const text = await res.text();
            const notJson = contentType.includes("text/html") || contentType.includes("application/octet-stream");
            if (!notJson) {
                try {
                    parsed = JSON.parse(text);
                } catch {
                    parsed = text;
                }
            } else {
                parsed = text;
            }
        } catch {
            /* unreadable body */
        }
        return {
            data: null,
            error: {
                status: res.status,
                message: parsed?.message ?? parsed?.error ?? `Request failed (${res.status})`,
                ...(parsed?.code ? { code: parsed.code } : {}),
                ...(parsed?.details ? { details: parsed.details } : {}),
            },
        };
    }

    if (res.status === 204) {
        if (method === "GET" && ttlMs > 0) cache.set(key, { data: null, expiresAt: Date.now() + ttlMs });
        return { data: null, error: null };
    }

    // Try JSON first. Many servers mislabel content-type (or omit it),
    // so we attempt JSON unless the content-type explicitly says otherwise.
    const text = await res.text();
    let parsed: unknown = text;
    const notJson =
        contentType.includes("text/html") ||
        contentType.includes("application/octet-stream") ||
        contentType.includes("image/");
    if (!notJson) {
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }
    }
    // Unwrap the project's standard `{ ok, data, ... }` envelope.
    if (parsed && typeof parsed === "object" && "ok" in parsed && "data" in parsed) {
        parsed = (parsed as { ok: boolean; data: unknown }).data;
    }

    if (schema) {
        const validation = schema.safeParse(parsed);
        if (!validation.success) {
            return {
                data: null,
                error: {
                    status: 0,
                    message: "Response did not match expected schema",
                    code: "VALIDATION_ERROR",
                    details: validation.error.issues,
                },
            };
        }
        parsed = validation.data;
    }

    if (method === "GET" && ttlMs > 0) {
        cache.set(key, { data: parsed, expiresAt: Date.now() + ttlMs });
    }
    return { data: parsed as T, error: null };
}
