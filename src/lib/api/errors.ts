/**
 * Typed application error hierarchy.
 *
 * Every thrown error in route handlers / services should be one of these.
 * The `withRequest` wrapper (Phase 2) converts them to a standardised JSON
 * response. Anything else is treated as a 500.
 *
 * Each error carries:
 *   - `code`: stable machine-readable string (clients can switch on this)
 *   - `status`: HTTP status code
 *   - `message`: human-readable, safe to show to end users
 *   - `details`: optional structured data (e.g. zod field errors)
 *   - `cause`: optional underlying error (kept on the server, not serialised)
 */

export type AppErrorCode =
    | "BAD_REQUEST"
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR"
    | "INTERNAL";

export class AppError extends Error {
    public readonly code: AppErrorCode;
    public readonly status: number;
    public readonly details?: unknown;
    public readonly cause?: unknown;

    constructor(code: AppErrorCode, status: number, message: string, opts?: { details?: unknown; cause?: unknown }) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.status = status;
        this.details = opts?.details;
        this.cause = opts?.cause;
        // Maintain proper stack trace in V8
        if (typeof Error.captureStackTrace === "function") {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad request", opts?: { details?: unknown; cause?: unknown }) {
        super("BAD_REQUEST", 400, message, opts);
        this.name = "BadRequestError";
    }
}

export class ValidationError extends AppError {
    constructor(details: unknown, message = "Validation failed") {
        super("VALIDATION_ERROR", 400, message, { details });
        this.name = "ValidationError";
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Authentication required") {
        super("UNAUTHORIZED", 401, message);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden") {
        super("FORBIDDEN", 403, message);
        this.name = "ForbiddenError";
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Not found") {
        super("NOT_FOUND", 404, message);
        this.name = "NotFoundError";
    }
}

export class ConflictError extends AppError {
    constructor(message = "Conflict", opts?: { details?: unknown }) {
        super("CONFLICT", 409, message, opts);
        this.name = "ConflictError";
    }
}

export class RateLimitError extends AppError {
    public readonly retryAfterSec: number;
    constructor(retryAfterSec = 60, message = "Too many requests") {
        super("RATE_LIMITED", 429, message, { details: { retryAfterSec } });
        this.name = "RateLimitError";
        this.retryAfterSec = retryAfterSec;
    }
}

export class UpstreamError extends AppError {
    constructor(message = "Upstream service error", opts?: { cause?: unknown; details?: unknown }) {
        super("UPSTREAM_ERROR", 502, message, opts);
        this.name = "UpstreamError";
    }
}

/**
 * Type guard: is this value an AppError?
 */
export function isAppError(err: unknown): err is AppError {
    return err instanceof AppError;
}
