/**
 * Role-based access control for admin users.
 *
 * Hierarchy:  superadmin > subadmin > seo_content
 *
 * A higher role implicitly satisfies any allowed-list that contains a lower
 * role. So a `superadmin` is also a `subadmin` and an `seo_content` for the
 * purposes of `hasRole`.
 *
 * The session shape mirrors `AdminTokenPayload`; we accept any object with a
 * `role` field so the helpers are easy to call from test code.
 */

export type AdminRole = "superadmin" | "subadmin" | "seo_content";

export type SessionWithRole = {
    role: AdminRole | string;
    sub?: string;
    email?: string;
    purpose?: string;
    [key: string]: unknown;
};

const RANK: Record<AdminRole, number> = {
    superadmin: 3,
    subadmin: 2,
    seo_content: 1,
};

/** True if the given session role is a known admin role. */
export function isKnownRole(role: string): role is AdminRole {
    return role === "superadmin" || role === "subadmin" || role === "seo_content";
}

/**
 * Returns true if the session's role is at least as privileged as any of
 * the allowed roles. `superadmin` always passes; `seo_content` only passes
 * when `["seo_content"]` (or any list where the highest allowed rank ≤ its own).
 */
export function hasRole(session: SessionWithRole, allowed: AdminRole[]): boolean {
    if (allowed.length === 0) return false;
    if (!isKnownRole(session.role)) return false;

    const sessionRank = RANK[session.role];
    // Find the lowest rank in the allowed list. The session must be ≥ it.
    const minRequired = Math.min(...allowed.map((r) => RANK[r]));
    return sessionRank >= minRequired;
}

export function isSuperAdmin(session: SessionWithRole): boolean {
    return session.role === "superadmin";
}

/**
 * A "subadmin or higher" — used for "can perform subadmin-level actions"
 * checks. Both `superadmin` and `subadmin` pass; `seo_content` doesn't.
 */
export function isSubAdmin(session: SessionWithRole): boolean {
    return session.role === "superadmin" || session.role === "subadmin";
}

/**
 * Strict: only the SEO-content role. Used for "this section is SEO-editable
 * by everyone, so non-SEO-content shouldn't see it" — though in practice the
 * hierarchy in `hasRole` is the canonical access check.
 */
export function isSeoContent(session: SessionWithRole): boolean {
    return session.role === "seo_content";
}
