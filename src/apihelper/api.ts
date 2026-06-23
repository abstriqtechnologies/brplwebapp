/**
 * fetch-based API client. Same-origin, so cookies (including admin
 * session) are sent automatically. The response is normalized to
 * `{ data, error, status, ok }` so call-sites that previously used
 * axios can switch with minimal changes.
 */

type ApiResponse<T = any> = {
    data: T;
    error?: string;
    status: number;
    ok: boolean;
};

async function request<T = any>(
    method: string,
    path: string,
    body?: any,
    init?: RequestInit
): Promise<ApiResponse<T>> {
    try {
        const headers: Record<string, string> = {
            Accept: "application/json",
            ...(init?.headers as Record<string, string> | undefined),
        };
        if (body !== undefined && !(body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }
        const res = await fetch(path, {
            method,
            credentials: "same-origin",
            headers,
            body:
                body === undefined
                    ? undefined
                    : body instanceof FormData
                        ? body
                        : JSON.stringify(body),
            cache: "no-store",
            ...init,
        });

        const contentType = res.headers.get("content-type") || "";

        if (!res.ok) {
            let errMsg = `Request failed (${res.status})`;
            if (contentType.includes("application/json")) {
                try {
                    const j = await res.json();
                    errMsg = j.error || j.message || errMsg;
                } catch {
                    /* ignore */
                }
            }
            return { data: null as any, error: errMsg, status: res.status, ok: false };
        }

        if (res.status === 204) {
            return { data: null as any, status: res.status, ok: true };
        }

        if (contentType.includes("application/json")) {
            const json = await res.json();
            if (json && typeof json === "object" && "ok" in json) {
                if (json.ok) {
                    return { data: (json.data ?? null) as T, status: res.status, ok: true };
                }
                return {
                    data: null as any,
                    error: json.error || "Request failed",
                    status: res.status,
                    ok: false,
                };
            }
            return { data: json as T, status: res.status, ok: true };
        }

        const blob = await res.blob();
        return { data: blob as any, status: res.status, ok: true };
    } catch (err: any) {
        return { data: null as any, error: err?.message || "Network error", status: 0, ok: false };
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
    delete: <T = any>(path: string, init?: RequestInit) =>
        request<T>("DELETE", path, undefined, init),
};

export default api;
