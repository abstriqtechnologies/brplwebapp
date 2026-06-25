/**
 * Lightweight structured logger.
 *
 * Emits one JSON object per line in production (greppable in log aggregators
 * like CloudWatch / Datadog / Vercel logs) and a human-friendly format in dev.
 *
 * Each log line carries a `requestId` so a single user request can be traced
 * across route handlers, service calls, and external HTTP requests.
 *
 * No external dependencies — uses `console.log/error/warn` directly.
 */

import { isDev } from "./env";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export type LogEntry = {
    ts: string;
    level: LogLevel;
    msg: string;
    requestId?: string;
    [k: string]: unknown;
};

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const MIN_LEVEL: LogLevel = isDev() ? "debug" : "info";

function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function emit(level: LogLevel, msg: string, ctx?: LogContext, err?: unknown) {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
        ts: new Date().toISOString(),
        level,
        msg,
        ...ctx,
    };

    if (err !== undefined) {
        entry.error = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err;
    }

    if (isDev()) {
        // Human-friendly dev format: "12:34:56 INFO  [req_abc] User logged in { userId: 42 }"
        const time = entry.ts.split("T")[1]!.slice(0, 8);
        const prefix = `${time} ${level.toUpperCase().padEnd(5)}`;
        const rid = entry.requestId ? ` [${entry.requestId}]` : "";
        const tail = Object.keys(ctx ?? {}).length ? ` ${JSON.stringify(ctx)}` : "";
        const line = `${prefix}${rid} ${msg}${tail}`;
        if (err !== undefined) {
            // eslint-disable-next-line no-console
            (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
                line,
                err instanceof Error ? err.stack : err,
            );
            return;
        }
        // eslint-disable-next-line no-console
        (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
        return;
    }

    // Production: JSON, one object per line.
    const serialized = JSON.stringify(entry);
    // eslint-disable-next-line no-console
    if (level === "error" || level === "warn") console.error(serialized);
    else console.log(serialized);
}

export const logger = {
    debug(msg: string, ctx?: LogContext) {
        emit("debug", msg, ctx);
    },
    info(msg: string, ctx?: LogContext) {
        emit("info", msg, ctx);
    },
    warn(msg: string, ctx?: LogContext, err?: unknown) {
        emit("warn", msg, ctx, err);
    },
    error(msg: string, ctx?: LogContext, err?: unknown) {
        emit("error", msg, ctx, err);
    },
    child(baseCtx: LogContext) {
        // Returns a logger that prepends the base context to every call.
        return {
            debug: (msg: string, ctx?: LogContext) => emit("debug", msg, { ...baseCtx, ...ctx }),
            info: (msg: string, ctx?: LogContext) => emit("info", msg, { ...baseCtx, ...ctx }),
            warn: (msg: string, ctx?: LogContext, err?: unknown) => emit("warn", msg, { ...baseCtx, ...ctx }, err),
            error: (msg: string, ctx?: LogContext, err?: unknown) => emit("error", msg, { ...baseCtx, ...ctx }, err),
        };
    },
};

/**
 * Generate a short, URL-safe request ID. Uses crypto.randomUUID when available.
 */
export function newRequestId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID (older runtimes).
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
