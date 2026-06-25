import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth, verifyPending, type AuthTokenPayload, type PendingTokenPayload } from "@/lib/auth/crypto";

const PROTECTED_PREFIXES = ["/dashboard"];
const PENDING_OR_UNPAID_PREFIXES = ["/checkout"];
const AUTH_PATHS = ["/login"];

function matchesAny(pathname: string, list: string[]) {
    return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

type SessionResult =
    | { valid: true; payload: AuthTokenPayload; expired: false }
    | { valid: false; expired: boolean };

async function readSession(req: NextRequest): Promise<SessionResult> {
    const token = req.cookies.get("brpl_auth")?.value;
    if (!token) return { valid: false, expired: false };
    const payload = await verifyAuth(token);
    if (payload) return { valid: true, payload, expired: false };
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
        /* ignore */
    }
    return { valid: false, expired };
}

async function readPending(req: NextRequest): Promise<PendingTokenPayload | null> {
    const token = req.cookies.get("brpl_pending")?.value;
    if (!token) return null;
    return verifyPending(token);
}

function safeNext(next: string | null, fallback: string): string {
    if (!next) return fallback;
    if (!next.startsWith("/")) return fallback;
    if (next.startsWith("//")) return fallback;
    return next;
}

function redirectTo(req: NextRequest, pathname: string, search: Record<string, string>) {
    const url = req.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    for (const [k, v] of Object.entries(search)) {
        url.searchParams.set(k, v);
    }
    return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const session = await readSession(req);

    /* --- /login --- */
    if (matchesAny(pathname, AUTH_PATHS)) {
        if (session.valid) {
            const target = safeNext(
                req.nextUrl.searchParams.get("next"),
                session.payload.paid ? "/dashboard" : "/checkout",
            );
            return redirectTo(req, target, {});
        }
        if (session.expired) {
            const res = NextResponse.next();
            res.cookies.delete("brpl_auth");
            return res;
        }
        return NextResponse.next();
    }

    /* --- /checkout: pending cookie OR auth+unpaid. Auth+paid → /dashboard. --- */
    if (matchesAny(pathname, PENDING_OR_UNPAID_PREFIXES)) {
        if (session.valid && session.payload.paid === true) {
            return redirectTo(req, safeNext(req.nextUrl.searchParams.get("next"), "/dashboard"), {});
        }
        const pending = await readPending(req);
        if (pending) return NextResponse.next();
        // Anything-not-paid (false OR undefined) is allowed at /checkout so that legacy
        // tokens issued before the `paid` field was introduced don't get bounced to /login.
        if (session.valid && session.payload.paid !== true) return NextResponse.next();
        return redirectTo(req, "/login", { next: pathname });
    }

    /* --- /dashboard: auth+paid only. --- */
    if (matchesAny(pathname, PROTECTED_PREFIXES)) {
        if (!session.valid) {
            const res = redirectTo(req, "/login", { next: pathname });
            if (session.expired) res.cookies.delete("brpl_auth");
            return res;
        }
        if (session.payload.paid === true) return NextResponse.next();
        return redirectTo(req, "/checkout", { next: pathname });
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/login",
        "/login/:path*",
        "/checkout",
        "/checkout/:path*",
    ],
};