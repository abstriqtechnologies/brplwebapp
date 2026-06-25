/**
 * Auth session helpers.
 *
 * `getAuthSession` and `getAdminSession` combine:
 *   1. Read the relevant cookie from the request.
 *   2. Verify the JWT (signature + purpose + expiry).
 *   3. Look the user/admin up in the DB (the JWT alone isn't authoritative —
 *      the user might have been deleted).
 *
 * Each function returns `null` if any step fails — they never throw. This
 * keeps guard clauses trivial: `if (!session) return NextResponse.redirect(...)`.
 *
 * The DB lookup is dependency-injected so:
 *   - Tests can pass an in-memory fake.
 *   - Production routes can pass a Mongoose-backed lookup without the session
 *     module depending on the database driver.
 */

import { logger } from "@/lib/logger";
import { verifyAuth, verifyAdmin, type AuthTokenPayload, type AdminTokenPayload } from "./crypto";
import { getAuthCookie, getAdminCookie } from "./cookies";

// ---------- Types ----------

export type AuthSession = {
    session: AuthTokenPayload;
    user: { _id: string; phone: string; [key: string]: unknown };
};

export type AdminSession = {
    session: AdminTokenPayload;
    admin: { _id: string; email: string; role: string; active: boolean; [key: string]: unknown };
};

// ---------- Lookup function types ----------

export type AuthLookup = (id: string) => Promise<{ _id: string; phone: string; [key: string]: unknown } | null>;

export type AdminLookup = (id: string) => Promise<{
    _id: string;
    email: string;
    role: string;
    active: boolean;
    [key: string]: unknown;
} | null>;

// ---------- Overloads ----------

/** Variant 1: explicit dependency injection (preferred in tests). */
export async function getAuthSession(deps: {
    getAuthCookie?: () => Promise<string | undefined>;
    lookup: AuthLookup;
}): Promise<AuthSession | null> {
    const read = deps.getAuthCookie ?? getAuthCookie;
    const lookup = deps.lookup;

    let token: string | undefined;
    try {
        token = await read();
    } catch (err) {
        logger.warn("auth.session: getAuthCookie threw", { err });
        return null;
    }
    if (!token) return null;

    const payload = await verifyAuth(token);
    if (!payload) return null;

    let user;
    try {
        user = await lookup(payload.sub);
    } catch (err) {
        logger.warn("auth.session: user lookup threw", { err, sub: payload.sub });
        return null;
    }
    if (!user) return null;

    return { session: payload, user };
}

export async function getAdminSession(deps: {
    getAdminCookie?: () => Promise<string | undefined>;
    lookup: AdminLookup;
}): Promise<AdminSession | null> {
    const read = deps.getAdminCookie ?? getAdminCookie;
    const lookup = deps.lookup;

    let token: string | undefined;
    try {
        token = await read();
    } catch (err) {
        logger.warn("auth.session: getAdminCookie threw", { err });
        return null;
    }
    if (!token) return null;

    const payload = await verifyAdmin(token);
    if (!payload) return null;

    let admin;
    try {
        admin = await lookup(payload.sub);
    } catch (err) {
        logger.warn("auth.session: admin lookup threw", { err, sub: payload.sub });
        return null;
    }
    if (!admin) return null;

    // Inactive admins are treated as logged out.
    if (admin.active === false) return null;

    return { session: payload, admin };
}
