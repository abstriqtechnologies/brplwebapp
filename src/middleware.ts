import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth, type AuthTokenPayload } from "@/lib/auth/crypto";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PATHS = ["/login"];

function isProtected(pathname: string) {
    return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
function isAuthPath(pathname: string) {
    return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

type SessionResult =
    | { valid: true; payload: AuthTokenPayload; expired: false }
    | { valid: false; expired: boolean };

/**
 * Edge-runtime friendly session reader. Uses the shared verifyAuth helper
 * from `@/lib/auth/crypto` so the rules (signature + purpose + expiry) stay
 * consistent with the rest of the app.
 *
 * We distinguish "expired" from "missing/invalid" so the middleware can clear
 * stale cookies.
 */
async function readSession(req: NextRequest): Promise<SessionResult> {
    const token = req.cookies.get("brpl_auth")?.value;
    if (!token) return { valid: false, expired: false };
    const payload = await verifyAuth(token);
    if (payload) return { valid: true, payload, expired: false };
    // verifyAuth returns null for expired OR wrong-purpose OR tampered tokens.
    // We can sniff expiry from the JWT without verifying (last segment is
    // the signature, second segment is the payload).
    let expired = false;
    try {
        const parts = token.split(".");
        if (parts.length === 3) {
            const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const padded = payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
            const decoded = JSON.parse(atob(padded));
            if (typeof decoded.exp === "number" && decoded.exp * 1000 < Date.now()) {
                expired = true;
            }
        }
    } catch {
        /* ignore — treat as non-expired invalid */
    }
    return { valid: false, expired };
}

/**
 * Validate `next` is a safe same-origin redirect target. Allows paths like
 * "/dashboard/profile" but rejects "//evil.com" and "http://evil.com".
 */
function safeNext(next: string | null): string {
    if (!next) return "/dashboard";
    if (!next.startsWith("/")) return "/dashboard";
    if (next.startsWith("//")) return "/dashboard";
    return next;
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    /* --- Authenticated user hitting /login → bounce to the next URL (or dashboard) --- */
    if (isAuthPath(pathname)) {
        const session = await readSession(req);
        if (session.valid) {
            const url = req.nextUrl.clone();
            url.pathname = safeNext(req.nextUrl.searchParams.get("next"));
            url.search = "";
            return NextResponse.redirect(url);
        }
        if (session.expired) {
            const res = NextResponse.next();
            res.cookies.delete("brpl_auth");
            return res;
        }
        return NextResponse.next();
    }

    /* --- Unauthenticated user hitting a protected page → bounce to /login --- */
    if (isProtected(pathname)) {
        const session = await readSession(req);
        if (session.valid) return NextResponse.next();

        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        const res = NextResponse.redirect(url);
        if (session.expired) res.cookies.delete("brpl_auth");
        return res;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/login/:path*"],
};
