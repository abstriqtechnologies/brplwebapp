import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

const ALG = "HS256";

export type SessionPayload = {
    sub: string; // userId (mongo _id as string) or "pending:<phone>"
    phone?: string;
    purpose?: "auth" | "pending_reg" | "admin";
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
export const COOKIE_NAMES = {
    AUTH: "brpl_auth",
    PENDING: "brpl_pending",
    ADMIN: "brpl_admin",
} as const;

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

export function authCookieOptions(maxAgeSec: number) {
    return { ...COOKIE_OPTIONS, maxAge: maxAgeSec };
}

export async function setAuthCookie(token: string) {
    const c = await cookies();
    c.set(COOKIE_NAMES.AUTH, token, authCookieOptions(7 * 24 * 60 * 60));
}

export async function setPendingCookie(token: string) {
    const c = await cookies();
    c.set(COOKIE_NAMES.PENDING, token, authCookieOptions(30 * 60)); // 30 min
}

export async function clearAuthCookies() {
    const c = await cookies();
    c.delete(COOKIE_NAMES.AUTH);
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
    c.set(COOKIE_NAMES.ADMIN, token, authCookieOptions(7 * 24 * 60 * 60));
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
    role: "superadmin" | "subadmin" | "seo_content";
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
