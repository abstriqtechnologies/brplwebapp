import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Pure data fetcher behind `useFetch`.
 *
 * - Parses the response against a zod schema (or returns raw JSON if none).
 * - In-memory cache keyed by URL; TTL configurable (default 30s).
 * - Returns the same shape the React hook will use: `{ data, error, loading }`.
 *
 * The hook (added in Phase 3.1 with the React adapter) is a thin wrapper
 * around this module. Testing this directly avoids the need for React
 * Testing Library.
 */

describe("api/cache", () => {
    let fetchSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
        fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
        // The cache lives inside the module — reset it before every test.
        vi.resetModules();
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    async function load() {
        return await import("@/lib/api/cache");
    }

    describe("basic fetch + parse", () => {
        it("returns parsed data when fetch succeeds", async () => {
            fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ items: [1, 2] }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { fetchJson } = await load();
            const result = await fetchJson("/api/x");
            expect(result.data).toEqual({ items: [1, 2] });
            expect(result.error).toBeNull();
        });

        it("returns an error envelope on 5xx", async () => {
            fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ error: "boom" }), { status: 500 }));
            const { fetchJson } = await load();
            const result = await fetchJson("/api/x");
            expect(result.data).toBeNull();
            expect(result.error).toMatchObject({
                status: 500,
                message: "boom",
            });
        });

        it("returns an error envelope on network error", async () => {
            fetchSpy.mockRejectedValueOnce(new Error("ECONNRESET"));
            const { fetchJson } = await load();
            const result = await fetchJson("/api/x");
            expect(result.data).toBeNull();
            expect(result.error?.status).toBe(0);
            expect(result.error?.message).toContain("ECONNRESET");
        });

        it("uses zod schema to validate the response when provided", async () => {
            fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ items: [1, 2] }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { z } = await import("zod");
            const { fetchJson } = await load();
            const schema = z.object({ items: z.array(z.number()) });
            const result = await fetchJson("/api/x", { schema });
            expect(result.data).toEqual({ items: [1, 2] });
        });

        it("returns a validation error when the schema rejects", async () => {
            fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ items: ["not numbers"] }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { z } = await import("zod");
            const { fetchJson } = await load();
            const schema = z.object({ items: z.array(z.number()) });
            const result = await fetchJson("/api/x", { schema });
            expect(result.data).toBeNull();
            expect(result.error?.code).toBe("VALIDATION_ERROR");
        });
    });

    describe("cache", () => {
        it("caches a successful response by URL for ttlMs", async () => {
            fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ a: 1 }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { fetchJson, _resetCache } = await load();
            _resetCache();
            const r1 = await fetchJson("/api/x", { ttlMs: 60_000 });
            const r2 = await fetchJson("/api/x", { ttlMs: 60_000 });
            expect(r1.data).toEqual({ a: 1 });
            expect(r2.data).toEqual({ a: 1 });
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it("does NOT cache error responses", async () => {
            fetchSpy.mockResolvedValue(new Response("boom", { status: 500 }));
            const { fetchJson, _resetCache } = await load();
            _resetCache();
            await fetchJson("/api/x");
            await fetchJson("/api/x");
            // 2 separate calls because errors don't populate the cache.
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it("expires cache entries after ttlMs", async () => {
            vi.useFakeTimers();
            fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ a: 1 }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { fetchJson, _resetCache } = await load();
            _resetCache();
            await fetchJson("/api/x", { ttlMs: 1000 });
            vi.advanceTimersByTime(1500);
            fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ a: 2 }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const r2 = await fetchJson("/api/x", { ttlMs: 1000 });
            expect(r2.data).toEqual({ a: 2 });
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it("invalidates a single URL when invalidate(url) is called", async () => {
            fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ a: 1 }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { fetchJson, invalidate } = await load();
            await fetchJson("/api/x", { ttlMs: 60_000 });
            invalidate("/api/x");
            fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ a: 2 }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const r2 = await fetchJson("/api/x", { ttlMs: 60_000 });
            expect(r2.data).toEqual({ a: 2 });
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe("credentials + content-type", () => {
        it("sends same-origin credentials and JSON content-type for POST", async () => {
            fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 200 }));
            const { fetchJson } = await load();
            await fetchJson("/api/x", { method: "POST", body: { a: 1 } });
            const init = fetchSpy.mock.calls[0]![1] as RequestInit;
            expect(init.credentials).toBe("same-origin");
            expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
            expect(init.body).toBe(JSON.stringify({ a: 1 }));
        });

        it("does NOT set content-type for FormData bodies", async () => {
            fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 200 }));
            const { fetchJson } = await load();
            const fd = new FormData();
            fd.append("a", "1");
            await fetchJson("/api/x", { method: "POST", body: fd });
            const init = fetchSpy.mock.calls[0]![1] as RequestInit;
            expect((init.headers as Record<string, string>)["content-type"]).toBeUndefined();
            expect(init.body).toBe(fd);
        });
    });
});
