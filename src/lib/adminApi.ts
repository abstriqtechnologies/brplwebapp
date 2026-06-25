/**
 * Legacy admin auth/response helpers — preserved for the 47 admin routes
 * that still import from here. The public shape is the same as before
 * (`{ ok, data | error }`) so the admin UI doesn't need to change.
 *
 * Internally, auth now flows through the canonical `@/lib/auth/middleware`
 * `requireAdmin` helper, which uses the new `verifyAdmin` + DB lookup under
 * the hood. The 47 existing routes don't need to change.
 *
 * The only behavioral difference from the pre-refactor implementation is
 * that `requireAdmin` now also re-loads the admin record from the DB and
 * checks `active === true` (inactive admins are treated as logged out).
 * This is the same check `withAdmin` performs in the new pattern.
 *
 * Routes that want the new error envelope (`{ ok, code, message, requestId }`)
 * should switch to `withRequest(withAdmin(...))` directly. New routes
 * should not import from this file.
 */

import "server-only";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin as requireAdminNew } from "@/lib/auth/middleware";
import { isAppError } from "@/lib/api/errors";
import { hasRole as newHasRole, isSuperAdmin as newIsSuperAdmin, type AdminRole } from "@/lib/auth/rbac";
import type { AdminSession as NewAdminSession } from "@/lib/auth/session";

export type RoleName = AdminRole;

/**
 * Legacy response helpers (shape preserved):
 *   ok(data)         → { ok: true, data }
 *   fail(msg, status) → { ok: false, error: msg }
 *
 * These are intentionally defined LOCALLY (not imported from
 * `@/lib/api/response`) so the 47 admin routes can keep their existing
 * response shape until they're individually migrated to the new pattern.
 */
export function ok<T>(data: T, init?: ResponseInit) {
    return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400) {
    return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Returns either the admin session (legacy shape) or a 401 NextResponse.
 * Internally uses the new `requireAdmin` from `@/lib/auth/middleware`.
 */
export async function requireAdmin(): Promise<NewAdminSession | NextResponse> {
    try {
        // Provide a default lookup that finds the admin by id from the DB.
        // This mirrors what `withAdmin` does in the new pattern.
        return await requireAdminNew({
            lookup: async (id: string) => {
                const { default: AdminUser } = await import("@/models/AdminUser");
                await connectDB();
                const doc = await AdminUser.findById(id).lean();
                if (!doc) return null;
                return {
                    _id: doc._id as any,
                    email: doc.email,
                    role: doc.role,
                    active: doc.active,
                    name: doc.name,
                } as any;
            },
        });
    } catch (err) {
        if (isAppError(err)) {
            return fail(err.message, err.status);
        }
        return fail("Internal error", 500);
    }
}

export async function requireAdminDb(): Promise<NewAdminSession | NextResponse> {
    const session = await requireAdmin();
    if (session instanceof NextResponse) return session;
    await connectDB();
    return session;
}

/**
 * Backwards-compat shim. `isSuperAdmin` and `hasRole` take the new
 * `NewAdminSession` shape (from `requireAdminDb`). Internally they unwrap
 * to the session payload before calling the new RBAC helpers.
 */
export function isSuperAdmin(session: NewAdminSession) {
    return newIsSuperAdmin(session.session);
}

/** Backwards-compat shim: same `hasRole` semantics. */
export function hasRole(session: NewAdminSession, allowed: RoleName[]) {
    return newHasRole(session.session, allowed);
}

export function badRequest(message: string) {
    return fail(message, 400);
}

export function notFound(message = "Not found") {
    return fail(message, 404);
}

export function serverError(err: unknown) {
    // eslint-disable-next-line no-console
    console.error(err);
    const message = err instanceof Error ? err.message : "Internal error";
    return fail(message, 500);
}
