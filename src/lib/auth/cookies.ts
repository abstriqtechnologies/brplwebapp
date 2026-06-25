/**
 * Cookie helpers for the three auth identities.
 *
 * Server-only. Wraps Next.js's `cookies()` API to set/get/clear the
 * `brpl_auth`, `brpl_pending`, and `brpl_admin` cookies.
 *
 * Every cookie is `httpOnly`, `sameSite=lax`, and scoped to `/`. The
 * `Secure` flag is set based on the actual request protocol (HTTPS), not
 * NODE_ENV — so `http://localhost:3000` in production-mode still works
 * for local testing, while HTTPS production deploys get the Secure flag
 * as browsers require.
 *
 * The TTL is provided by the caller via `maxAge` so the helpers can be
 * reused with different expiry durations.
 */

import "server-only";
import { cookies, headers } from "next/headers";

export const COOKIE_NAMES = {
    AUTH: "brpl_auth",
    PENDING: "brpl_pending",
    ADMIN: "brpl_admin",
} as const;

/**
 * Detect whether the current request came in over HTTPS. Reads
 * `x-forwarded-proto` (set by reverse proxies, load balancers, and most
 * hosting platforms) and `x-forwarded-ssl` as a backup.
 *
 * If the helper is called outside a request context (e.g. during
 * background jobs), we can't detect a protocol, so we default to
 * `secure=true` — the safer choice for production.
 */
async function isHttpsRequest(): Promise<boolean> {
    try {
        const h = await headers();
        const proto = h.get("x-forwarded-proto")?.toLowerCase().split(",")[0].trim();
        if (proto === "https") return true;
        if (h.get("x-forwarded-ssl") === "on") return true;
        return false;
    } catch {
        // No request context (e.g. background job). Default to secure.
        return true;
    }
}

/** Build a cookie-options object with the given TTL (seconds). */
export async function authCookieOptions(maxAgeSec: number) {
    return {
        httpOnly: true,
        secure: await isHttpsRequest(),
        sameSite: "lax" as const,
        path: "/",
        maxAge: maxAgeSec,
    };
}

export async function setAuthCookie(token: string, ttlSec = 7 * 24 * 60 * 60): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAMES.AUTH, token, await authCookieOptions(ttlSec));
}

export async function setPendingCookie(token: string, ttlSec = 30 * 60): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAMES.PENDING, token, await authCookieOptions(ttlSec));
}

export async function setAdminCookie(token: string, ttlSec = 8 * 60 * 60): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAMES.ADMIN, token, await authCookieOptions(ttlSec));
}

export async function getAuthCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(COOKIE_NAMES.AUTH)?.value;
}

export async function getPendingCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(COOKIE_NAMES.PENDING)?.value;
}

export async function getAdminCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(COOKIE_NAMES.ADMIN)?.value;
}

/**
 * Clear both user-side cookies (auth + pending). Does NOT touch admin.
 */
export async function clearAuthCookies(): Promise<void> {
    const c = await cookies();
    c.delete(COOKIE_NAMES.AUTH);
    c.delete(COOKIE_NAMES.PENDING);
}

/** Clear only the pending cookie (used after upgrade to full auth). */
export async function clearPendingCookie(): Promise<void> {
    const c = await cookies();
    c.delete(COOKIE_NAMES.PENDING);
}

/** Clear only the admin cookie. */
export async function clearAdminCookie(): Promise<void> {
    const c = await cookies();
    c.delete(COOKIE_NAMES.ADMIN);
}
