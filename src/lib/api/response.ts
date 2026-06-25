/**
 * Standardised API response helpers.
 *
 * Every route handler in the project returns one of two shapes:
 *
 * Success:
 *   { ok: true, data: <T>, requestId?: string }
 *
 * Failure:
 *   { ok: false, code: AppErrorCode, message: string, details?: unknown, requestId?: string }
 *
 * `code` is stable across releases so clients can switch on it.
 *
 * These helpers produce `NextResponse` objects. Use them directly in route
 * handlers:
 *
 *   export async function POST(req: Request) {
 *     return ok(await createX(await req.json()));
 *   }
 *
 *   export async function GET() {
 *     throw new NotFoundError("User not found");
 *   }
 */

import { NextResponse } from "next/server";
import { isAppError, RateLimitError } from "./errors";

export type ApiOk<T> = {
    ok: true;
    data: T;
    requestId?: string;
};

export type ApiErr = {
    ok: false;
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
};

export type ApiResponse<T> = ApiOk<T> | ApiErr;

/** Build a 200 JSON success response. */
export function ok<T>(data: T, init?: { status?: number; requestId?: string; headers?: HeadersInit }) {
    const body: ApiOk<T> = { ok: true, data, ...(init?.requestId ? { requestId: init.requestId } : {}) };
    return NextResponse.json(body, {
        status: init?.status ?? 200,
        headers: init?.headers,
    });
}

/** Build a 204 No Content response. */
export function noContent() {
    return new NextResponse(null, { status: 204 });
}

/**
 * Build an error response from any thrown value. AppErrors are mapped to their
 * declared status; unknown errors become a generic 500 (without leaking the
 * message to the client).
 */
export function fail(err: unknown, requestId?: string): NextResponse {
    if (isAppError(err)) {
        const body: ApiErr = {
            ok: false,
            code: err.code,
            message: err.message,
            ...(err.details !== undefined ? { details: err.details } : {}),
            ...(requestId ? { requestId } : {}),
        };
        const headers: HeadersInit = err instanceof RateLimitError ? { "Retry-After": String(err.retryAfterSec) } : {};
        return NextResponse.json(body, { status: err.status, headers });
    }

    // Unknown error — never leak the message. Log it server-side; return generic 500.
    // eslint-disable-next-line no-console
    console.error("[api] unhandled error", err);
    const body: ApiErr = {
        ok: false,
        code: "INTERNAL",
        message: "Internal server error",
        ...(requestId ? { requestId } : {}),
    };
    return NextResponse.json(body, { status: 500 });
}

/** Convenience: re-export the AppError constructors so callers can import from one place. */
export {
    AppError,
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    RateLimitError,
    UnauthorizedError,
    UpstreamError,
    ValidationError,
    isAppError,
} from "./errors";
