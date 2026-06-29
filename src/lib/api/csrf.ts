/**
 * CSRF protection via double-submit cookie.
 *
 * Flow:
 *   1. After admin login, server issues a non-httpOnly cookie `Brpl_csrf`
 *      with a random token.
 *   2. Client reads the cookie via `document.cookie` and echoes the value
 *      in the `X-CSRF-Token` header on every mutating request.
 *   3. Server compares cookie value === header value. Mismatch → 403.
 *
 * Why non-httpOnly? So client JS can read it. This is safe because:
 *   - An attacker on a different origin cannot read this site's cookies.
 *   - The header alone is not trusted — only cookie+header together.
 *
 * Opt-in via `Brpl_CSRF_REQUIRED=true` so the existing smoke tests keep
 * working during the rollout.
 */

import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { ForbiddenError } from "@/lib/api/errors";
import { env, isProduction } from "@/lib/env";

export const CSRF_COOKIE = "Brpl_csrf";
export const CSRF_HEADER = "x-csrf-token";
const TTL_SEC = 8 * 60 * 60;

/** Generate a 32-byte URL-safe token. */
function generateToken(): string {
    return crypto.randomBytes(32).toString("base64url");
}

/** Set the CSRF cookie on the response and return the token value. */
export async function issueCsrfCookie(): Promise<string> {
    const token = generateToken();
    const c = await cookies();
    c.set(CSRF_COOKIE, token, {
        // NOT httpOnly — must be readable by client JS.
        httpOnly: false,
        secure: isProduction(),
        sameSite: "lax",
        path: "/",
        maxAge: TTL_SEC,
    });
    return token;
}

/** Read the current CSRF cookie value (server-side). */
async function readCsrfCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(CSRF_COOKIE)?.value;
}

/**
 * Constant-time equality comparison to prevent timing attacks. Falls back to
 * `false` on length mismatch (length is not secret).
 */
function constantTimeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

/**
 * Assert that the request's `X-CSRF-Token` header matches the CSRF cookie.
 * Throws `ForbiddenError` on mismatch.
 *
 * Skipped when `Brpl_CSRF_REQUIRED` is not set to true (default: off in dev/test).
 */
export async function assertCsrf(req: Request): Promise<void> {
    if (!env.Brpl_CSRF_REQUIRED) return;

    const cookieToken = await readCsrfCookie();
    const headerToken = req.headers.get(CSRF_HEADER);

    if (!cookieToken || !headerToken) {
        throw new ForbiddenError("CSRF token missing");
    }
    if (!constantTimeEqual(cookieToken, headerToken)) {
        throw new ForbiddenError("CSRF token mismatch");
    }
}

/** Remove the CSRF cookie (logout). */
export async function clearCsrfCookie(): Promise<void> {
    const c = await cookies();
    c.delete(CSRF_COOKIE);
}
