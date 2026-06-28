import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { env } from "@/lib/env";

// dev-insecure fallback is also in `env` when JWT_SECRET is missing in dev.
const JWT_SECRET = env.JWT_SECRET;
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

const ALG = "HS256";

/**
 * Detect HTTPS from request headers (x-forwarded-proto / x-forwarded-ssl).
 * The canonical copy of this helper lives in `src/lib/auth/cookies.ts` —
 * this is duplicated because `jwt.ts` is imported by the admin side of the
 * app, and a few callers still pull their cookie helpers from here. Both
 * copies must be kept in sync; consolidate them when the admin side moves
 * to `@/lib/auth/cookies`.
 *
 * Outside a request context (e.g. background jobs) we default to secure=true.
 */
async function isHttpsRequest(): Promise<boolean> {
    try {
        const h = await headers();
        const proto = h.get("x-forwarded-proto")?.toLowerCase().split(",")[0].trim();
        if (proto === "https") return true;
        if (h.get("x-forwarded-ssl") === "on") return true;
        return false;
    } catch {
        return true;
    }
}

export type SessionPayload = {
    sub: string; // userId (mongo _id as string) or "pending:<phone>"
    phone?: string;
    purpose?: "auth" | "pending_reg" | "admin" | "admin_otp";
    paymentId?: string;
    orderId?: string;
    role?: string;
    email?: string;
    name?: string;
    [key: string]: unknown;
};

export async function signJwt(payload: SessionPayload, expiresIn: string = "7d"): Promise<string> {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .setSubject(payload.sub)
        .sign(SECRET_KEY);
}

export async function verifyJwt<T = SessionPayload>(token: string): Promise<T | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: [ALG] });
        return payload as T;
    } catch {
        return null;
    }
}

// Cookie helpers
//
// NOTE: this file is a parallel implementation of the helpers in
// `src/lib/auth/cookies.ts`, kept for backwards compatibility with admin
// routes that import from here. The canonical source is `auth/cookies.ts`.
// Both must use the same protocol-based `Secure` logic; see
// `isHttpsRequest` above and its twin in `auth/cookies.ts`.

export const COOKIE_NAMES = {
    AUTH: "brpl_auth",
    PENDING: "brpl_pending",
    ADMIN: "brpl_admin",
} as const;

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

export async function setAuthCookie(token: string) {
    const c = await cookies();
    c.set(COOKIE_NAMES.AUTH, token, await authCookieOptions(7 * 24 * 60 * 60));
}

export async function setPendingCookie(token: string) {
    const c = await cookies();
    c.set(COOKIE_NAMES.PENDING, token, await authCookieOptions(30 * 60)); // 30 min
}

export async function clearAuthCookies() {
    const c = await cookies();
    c.delete(COOKIE_NAMES.AUTH);
    c.delete(COOKIE_NAMES.PENDING);
}

// Clear only the pending cookie (used after upgrading to a full auth cookie,
// where the just-set auth cookie must NOT be wiped out).
export async function clearPendingCookie() {
    const c = await cookies();
    c.delete(COOKIE_NAMES.PENDING);
}

export async function getAuthCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(COOKIE_NAMES.AUTH)?.value;
}

export async function getPendingCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(COOKIE_NAMES.PENDING)?.value;
}

// Admin cookie helpers
export async function setAdminCookie(token: string) {
    const c = await cookies();
    c.set(COOKIE_NAMES.ADMIN, token, await authCookieOptions(7 * 24 * 60 * 60));
}

export async function getAdminCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(COOKIE_NAMES.ADMIN)?.value;
}

export async function clearAdminCookie() {
    const c = await cookies();
    c.delete(COOKIE_NAMES.ADMIN);
}

export type AdminSession = {
    sub: string;
    email: string;
    role: "superadmin";
    name?: string;
    purpose: "admin";
};

export async function getAdminSession(): Promise<AdminSession | null> {
    const token = await getAdminCookie();
    if (!token) return null;
    const payload = await verifyJwt<AdminSession>(token);
    if (!payload || payload.purpose !== "admin") return null;
    return payload;
}
