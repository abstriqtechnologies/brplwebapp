/**
 * Resilient HTTP client — wraps `fetch` with:
 *
 *   - AbortController-based timeout (default 10 s).
 *   - Exponential backoff with jitter, on network errors or 5xx.
 *   - Idempotent verbs (GET, PUT, DELETE, HEAD, OPTIONS) retry by default.
 *     POST/PATCH only retry if the caller adds the verb to `retryableMethods`.
 *   - 4xx responses NEVER retry — they're caller errors.
 *   - Per-instance circuit breaker. Opens after `consecutiveFailures` 5xx /
 *     network errors; once open, calls fail-fast until manually reset.
 *
 * Usage:
 *
 *   const data = await httpFetch<{ ok: boolean }>("https://x.test/health");
 *   const json = await httpFetch("https://x.test/api", { method: "POST", body });
 *
 * The client is intentionally small. For most callers the defaults are fine.
 */

import { UpstreamError } from "@/lib/api/errors";

// ---------- Types ----------

export type HttpFetchOptions = RequestInit & {
    /** Per-request timeout in ms. Default: 10 000. */
    timeoutMs?: number;
    /** Maximum retries on 5xx / network errors. Default: 2 (so up to 3 attempts total). */
    maxRetries?: number;
    /** Methods that may be retried. Default: GET, PUT, DELETE, HEAD, OPTIONS. */
    retryableMethods?: string[];
    /** Consecutive 5xx/network errors before the circuit opens. Default: 5. */
    consecutiveFailures?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_CONSECUTIVE_FAILURES = 5;

const IDEMPOTENT_METHODS = new Set(["GET", "PUT", "DELETE", "HEAD", "OPTIONS"]);

// ---------- Circuit breaker ----------

type CircuitState = {
    failures: number;
    openUntil: number; // epoch ms; circuit is "open" while Date.now() < openUntil
};

function freshCircuit(): CircuitState {
    return { failures: 0, openUntil: 0 };
}

// Process-local circuit registry keyed by base URL. Simple, but enough for
// the SMS / Razorpay / internal-service cases. Multi-instance deployments
// would need a shared store (Phase 4+).
const circuits = new Map<string, CircuitState>();

function getCircuit(key: string): CircuitState {
    let c = circuits.get(key);
    if (!c) {
        c = freshCircuit();
        circuits.set(key, c);
    }
    return c;
}

export function resetCircuit(key: string): void {
    circuits.delete(key);
}

export function resetAllCircuits(): void {
    circuits.clear();
}

function circuitKey(url: string): string {
    try {
        const u = new URL(url);
        return `${u.protocol}//${u.host}`;
    } catch {
        return url;
    }
}

function maybeOpenCircuit(circuit: CircuitState, threshold: number) {
    if (circuit.failures >= threshold) {
        circuit.openUntil = Date.now() + 30_000; // 30 s cool-off
    }
}

// ---------- Core ----------

function isRetryableStatus(status: number): boolean {
    return status >= 500 && status < 600;
}

function backoffMs(attempt: number, base = 200): number {
    // Exponential with full jitter: random in [0, base * 2^attempt).
    const cap = base * 2 ** attempt;
    return Math.floor(Math.random() * cap);
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * Make a single fetch attempt. Returns the Response on 2xx; throws on
 * timeout / network error / non-2xx.
 */
async function attempt(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Public API: make a resilient HTTP request and parse JSON.
 */
export async function httpFetch<T = unknown>(url: string, options: HttpFetchOptions = {}): Promise<T> {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        maxRetries = DEFAULT_MAX_RETRIES,
        consecutiveFailures = DEFAULT_CONSECUTIVE_FAILURES,
        retryableMethods,
        ...init
    } = options;

    const method = (init.method ?? "GET").toUpperCase();
    const canRetry = retryableMethods
        ? retryableMethods.map((m) => m.toUpperCase()).includes(method)
        : IDEMPOTENT_METHODS.has(method);

    const ckey = circuitKey(url);
    const circuit = getCircuit(ckey);

    // Fast-fail if the circuit is open.
    if (circuit.openUntil > Date.now()) {
        throw new UpstreamError(`circuit open for ${ckey}`, {
            details: { retryAfterMs: circuit.openUntil - Date.now() },
        });
    }

    let lastErr: unknown;
    for (let attemptIdx = 0; attemptIdx <= maxRetries; attemptIdx++) {
        try {
            const res = await attempt(url, init, timeoutMs);
            if (res.status >= 200 && res.status < 300) {
                // Success — reset failure count.
                circuit.failures = 0;
                if (res.status === 204) return undefined as T;
                const contentType = res.headers.get("content-type") ?? "";
                if (contentType.includes("application/json")) {
                    return (await res.json()) as T;
                }
                return (await res.text()) as unknown as T;
            }
            // Non-2xx.
            if (isRetryableStatus(res.status)) {
                circuit.failures++;
                maybeOpenCircuit(circuit, consecutiveFailures);
            }
            if (isRetryableStatus(res.status) && canRetry && attemptIdx < maxRetries) {
                lastErr = new UpstreamError(`HTTP ${res.status} from ${url}`, { details: { status: res.status, url } });
                await sleep(backoffMs(attemptIdx));
                continue;
            }
            // Non-retryable (4xx or out of retries).
            const text = await res.text().catch(() => "");
            throw new UpstreamError(`HTTP ${res.status} from ${url}: ${text.slice(0, 200)}`, {
                details: { status: res.status, url, body: text.slice(0, 500) },
            });
        } catch (err) {
            // Network / abort / fetch-thrown (NOT an UpstreamError — those
            // we re-throw as-is).
            if (err instanceof UpstreamError) throw err;
            circuit.failures++;
            maybeOpenCircuit(circuit, consecutiveFailures);
            if (canRetry && attemptIdx < maxRetries) {
                lastErr = err;
                await sleep(backoffMs(attemptIdx));
                continue;
            }
            throw new UpstreamError(`Network error talking to ${url}: ${(err as Error).message ?? String(err)}`, {
                cause: err,
            });
        }
    }

    // Should be unreachable — the loop either returns or throws.
    throw lastErr ?? new UpstreamError(`Unknown error calling ${url}`);
}
