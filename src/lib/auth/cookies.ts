/**
 * Cookie helpers for the three auth identities.
 *
 * Server-only. Wraps Next.js's `cookies()` API to set/get/clear the
 * `brpl_auth`, `brpl_pending`, and `brpl_admin` cookies.
 *
 * Every cookie is `httpOnly`, `secure` in production, `sameSite=lax`,
 * and scoped to `/`. The TTL is provided by the caller via `maxAge`
 * so the helpers can be reused with different expiry durations.
 */

import "server-only";
import { cookies } from "next/headers";
import { isProduction } from "@/lib/env";

export const COOKIE_NAMES = {
    AUTH: "brpl_auth",
    PENDING: "brpl_pending",
    ADMIN: "brpl_admin",
} as const;

const BASE_OPTIONS = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
};

/** Build a cookie-options object with the given TTL (seconds). */
export function authCookieOptions(maxAgeSec: number) {
    return { ...BASE_OPTIONS, maxAge: maxAgeSec };
}

export async function setAuthCookie(token: string, ttlSec = 7 * 24 * 60 * 60): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAMES.AUTH, token, authCookieOptions(ttlSec));
}

export async function setPendingCookie(token: string, ttlSec = 30 * 60): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAMES.PENDING, token, authCookieOptions(ttlSec));
}

export async function setAdminCookie(token: string, ttlSec = 8 * 60 * 60): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAMES.ADMIN, token, authCookieOptions(ttlSec));
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
