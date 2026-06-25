import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Resilient fetch wrapper.
 *
 * Features:
 *   - AbortController-based timeout (default 10s).
 *   - Exponential backoff with jitter, idempotent verbs only.
 *   - Per-instance circuit breaker (opens after N consecutive 5xx failures).
 *   - Plain JSON in/out; throws `UpstreamError` on persistent failure.
 *
 * The retry policy is intentionally conservative: only idempotent verbs
 * (GET/PUT/DELETE) and only on network errors or 5xx responses. POST is
 * retried only on `retryableStatusCodes` if the caller opts in.
 */

describe("api/http-client", () => {
    let fetchSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
    });
    afterEach(async () => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
        // Reset the in-memory circuit registry so tests don't leak state.
        const mod = await import("@/lib/api/http-client");
        mod.resetAllCircuits();
    });

    async function load() {
        return await import("@/lib/api/http-client");
    }

    describe("basic GET", () => {
        it("returns parsed JSON on 2xx", async () => {
            fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ hello: "world" }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { httpFetch } = await load();
            const data = await httpFetch("https://x.test/api");
            expect(data).toEqual({ hello: "world" });
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it("accepts a string URL", async () => {
            fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 200 }));
            const { httpFetch } = await load();
            await httpFetch("https://x.test/api");
            expect(fetchSpy.mock.calls[0]![0]).toBe("https://x.test/api");
        });

        it("passes through request init (method, headers, body)", async () => {
            fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 200 }));
            const { httpFetch } = await load();
            await httpFetch("https://x.test/api", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ a: 1 }),
            });
            const init = fetchSpy.mock.calls[0]![1] as RequestInit;
            expect(init.method).toBe("POST");
            expect(init.body).toBe(JSON.stringify({ a: 1 }));
        });
    });

    describe("timeout", () => {
        it("aborts the request when timeoutMs is exceeded", async () => {
            // Use real timers but a very short timeout.
            fetchSpy.mockImplementation(
                (_url: string, init: RequestInit) =>
                    new Promise((_resolve, reject) => {
                        init.signal?.addEventListener("abort", () => {
                            const e: any = new Error("aborted");
                            e.name = "AbortError";
                            reject(e);
                        });
                    }),
            );
            const { httpFetch } = await load();
            await expect(
                httpFetch("https://x.test/slow", {
                    timeoutMs: 50,
                    maxRetries: 0, // no retry → no sleep involved
                }),
            ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
        });
    });

    describe("retry", () => {
        it("retries on 5xx for idempotent verbs", async () => {
            fetchSpy.mockResolvedValueOnce(new Response("boom", { status: 503 })).mockResolvedValueOnce(
                new Response("{}", {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { httpFetch } = await load();
            const data = await httpFetch("https://x.test/api");
            expect(data).toEqual({});
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it("retries on network error (fetch throws)", async () => {
            fetchSpy.mockRejectedValueOnce(new Error("ECONNRESET")).mockResolvedValueOnce(
                new Response("{}", {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { httpFetch } = await load();
            const data = await httpFetch("https://x.test/api");
            expect(data).toEqual({});
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it("does NOT retry on 4xx", async () => {
            fetchSpy.mockResolvedValueOnce(new Response("not found", { status: 404 }));
            const { httpFetch } = await load();
            await expect(httpFetch("https://x.test/api")).rejects.toMatchObject({
                code: "UPSTREAM_ERROR",
            });
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it("does NOT retry POST by default (non-idempotent)", async () => {
            fetchSpy.mockResolvedValueOnce(new Response("boom", { status: 503 }));
            const { httpFetch } = await load();
            await expect(httpFetch("https://x.test/api", { method: "POST", body: "{}" })).rejects.toMatchObject({
                code: "UPSTREAM_ERROR",
            });
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it("retries POST when caller opts in via retryableMethods", async () => {
            fetchSpy.mockResolvedValueOnce(new Response("boom", { status: 503 })).mockResolvedValueOnce(
                new Response("{}", {
                    status: 200,
                    headers: { "content-type": "application/json" },
                }),
            );
            const { httpFetch } = await load();
            const data = await httpFetch("https://x.test/api", {
                method: "POST",
                body: "{}",
                retryableMethods: ["POST"],
            });
            expect(data).toEqual({});
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it("gives up after maxRetries and throws UpstreamError", async () => {
            fetchSpy.mockResolvedValue(new Response("boom", { status: 503 }));
            const { httpFetch } = await load();
            await expect(httpFetch("https://x.test/api", { maxRetries: 2 })).rejects.toMatchObject({
                code: "UPSTREAM_ERROR",
            });
            // 1 initial + 2 retries = 3 calls
            expect(fetchSpy).toHaveBeenCalledTimes(3);
        });
    });

    describe("circuit breaker", () => {
        it("opens after consecutiveFailures threshold, then short-circuits", async () => {
            fetchSpy.mockResolvedValue(new Response("boom", { status: 500 }));
            const { httpFetch } = await load();
            // Open the circuit.
            for (let i = 0; i < 3; i++) {
                await expect(
                    httpFetch("https://x.test/api", { maxRetries: 0, consecutiveFailures: 3 }),
                ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
            }
            // Next call should NOT hit fetch at all — circuit is open.
            const callsBefore = fetchSpy.mock.calls.length;
            await expect(httpFetch("https://x.test/api", { maxRetries: 0, consecutiveFailures: 3 })).rejects.toThrow(
                /circuit open/i,
            );
            expect(fetchSpy.mock.calls.length).toBe(callsBefore);
        });

        it("does NOT count 4xx as a failure for the breaker", async () => {
            fetchSpy.mockResolvedValue(new Response("not found", { status: 404 }));
            const { httpFetch } = await load();
            // 5 consecutive 4xx — circuit should remain closed.
            for (let i = 0; i < 5; i++) {
                await expect(
                    httpFetch("https://x.test/api", { maxRetries: 0, consecutiveFailures: 3 }),
                ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
            }
            // Circuit still closed — the next call will hit fetch.
            const callsBefore = fetchSpy.mock.calls.length;
            fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 200 }));
            await httpFetch("https://x.test/api", { maxRetries: 0, consecutiveFailures: 3 });
            expect(fetchSpy.mock.calls.length).toBe(callsBefore + 1);
        });
    });

    describe("UpstreamError shape", () => {
        it("carries the original status and URL", async () => {
            fetchSpy.mockResolvedValue(new Response("nope", { status: 502 }));
            const { httpFetch } = await load();
            try {
                await httpFetch("https://x.test/down", { maxRetries: 0 });
                expect.fail("should have thrown");
            } catch (err: any) {
                expect(err.code).toBe("UPSTREAM_ERROR");
                expect(err.status).toBe(502);
                expect(err.message).toContain("502");
                expect(err.message).toContain("https://x.test/down");
            }
        });
    });
});
