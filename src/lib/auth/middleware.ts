/**
 * Route-handler auth guards.
 *
 * These helpers verify the request and either return the session or THROW a
 * typed AppError. The `withRequest()` wrapper (Phase 1.7) catches the error
 * and converts it to a JSON response.
 *
 *   throw UnauthorizedError → 401
 *   throw ForbiddenError    → 403
 *
 * Each helper accepts its dependencies via injection so tests can run without
 * a real database.
 */

import "server-only";
import { UnauthorizedError, ForbiddenError } from "@/lib/api/errors";
import { getAuthCookie, getPendingCookie, getAdminCookie } from "./cookies";
import { getAuthSession, getAdminSession, type AuthSession, type AdminSession } from "./session";
import { hasRole, type AdminRole } from "./rbac";
import { verifyPending } from "./crypto";

export type PendingSession = {
    session: {
        sub: string;
        phone: string;
        purpose: "pending_reg";
        [key: string]: unknown;
    };
};

// ---------- requireAuth ----------

export async function requireAuth(deps?: {
    getAuthCookie?: () => Promise<string | undefined>;
    lookup: (id: string) => Promise<{ _id: string; phone: string; [k: string]: unknown } | null>;
}): Promise<AuthSession> {
    const session = await getAuthSession({
        ...(deps?.getAuthCookie ? { getAuthCookie: deps.getAuthCookie } : {}),
        lookup: deps!.lookup,
    });
    if (!session) throw new UnauthorizedError();
    return session;
}

// ---------- requireAdmin ----------

export async function requireAdmin(deps: {
    getAdminCookie?: () => Promise<string | undefined>;
    lookup: (id: string) => Promise<{
        _id: string;
        email: string;
        role: string;
        active: boolean;
        [k: string]: unknown;
    } | null>;
    allowedRoles?: AdminRole[];
}): Promise<AdminSession> {
    const session = await getAdminSession({
        ...(deps.getAdminCookie ? { getAdminCookie: deps.getAdminCookie } : {}),
        lookup: deps.lookup,
    });
    if (!session) throw new UnauthorizedError();

    if (deps.allowedRoles && !hasRole(session.session, deps.allowedRoles)) {
        throw new ForbiddenError(`Requires one of: ${deps.allowedRoles.join(", ")}`);
    }

    return session;
}

// ---------- requirePending ----------

export async function requirePending(deps?: {
    getPendingCookie?: () => Promise<string | undefined>;
}): Promise<PendingSession> {
    const read = deps?.getPendingCookie ?? getPendingCookie;
    const token = await read();
    if (!token) throw new UnauthorizedError("Pending verification required");

    const payload = await verifyPending(token);
    if (!payload) throw new UnauthorizedError("Invalid pending session");
    if (!payload.phone) throw new UnauthorizedError("Pending session missing phone");

    return { session: payload };
}
