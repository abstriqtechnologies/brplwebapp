/**
 * Role-based access control for admin users.
 *
 * The platform has one admin permission role: `superadmin`.
 *
 * The session shape mirrors `AdminTokenPayload`; we accept any object with a
 * `role` field so the helpers are easy to call from test code.
 */

export type AdminRole = "superadmin";

export type SessionWithRole = {
    role: AdminRole | string;
    sub?: string;
    email?: string;
    purpose?: string;
    [key: string]: unknown;
};

/** True if the given session role is a known admin role. */
export function isKnownRole(role: string): role is AdminRole {
    return role === "superadmin";
}

/** Returns true if the session is the sole admin role and that role is allowed. */
export function hasRole(session: SessionWithRole, allowed: AdminRole[]): boolean {
    if (allowed.length === 0) return false;
    if (!isKnownRole(session.role)) return false;
    return allowed.includes(session.role);
}

export function isSuperAdmin(session: SessionWithRole): boolean {
    return session.role === "superadmin";
}
