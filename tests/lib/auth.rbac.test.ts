import { describe, it, expect } from "vitest";

/**
 * Role-based access control for admin users.
 *
 * Roles form a strict hierarchy: superadmin > subadmin > seo_content.
 * - superadmin: full access.
 * - subadmin:   can do everything except delete and certain high-risk ops.
 * - seo_content: can only edit SEO-related sections (used by the CMS later).
 */

import { hasRole, isSuperAdmin, isSubAdmin, isSeoContent } from "@/lib/auth/rbac";

const ADMIN_ROLES = ["superadmin", "subadmin", "seo_content"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

const session = (role: AdminRole) => ({ role, sub: "x", email: "a@a", purpose: "admin" as const });

describe("auth/rbac", () => {
    describe("hasRole", () => {
        it("returns true when the role exactly matches", () => {
            expect(hasRole(session("superadmin"), ["superadmin"])).toBe(true);
            expect(hasRole(session("subadmin"), ["subadmin"])).toBe(true);
            expect(hasRole(session("seo_content"), ["seo_content"])).toBe(true);
        });

        it("returns false when the role does not match", () => {
            expect(hasRole(session("subadmin"), ["superadmin"])).toBe(false);
            expect(hasRole(session("seo_content"), ["superadmin", "subadmin"])).toBe(false);
        });

        it("superadmin satisfies any allowed-list (hierarchy)", () => {
            expect(hasRole(session("superadmin"), ["subadmin"])).toBe(true);
            expect(hasRole(session("superadmin"), ["seo_content"])).toBe(true);
            expect(hasRole(session("superadmin"), ["subadmin", "seo_content"])).toBe(true);
        });

        it("subadmin satisfies any allowed-list except superadmin-only", () => {
            expect(hasRole(session("subadmin"), ["seo_content"])).toBe(true);
            expect(hasRole(session("subadmin"), ["subadmin", "seo_content"])).toBe(true);
            expect(hasRole(session("subadmin"), ["superadmin"])).toBe(false);
        });

        it("seo_content satisfies lists that explicitly include seo_content", () => {
            expect(hasRole(session("seo_content"), ["seo_content"])).toBe(true);
            expect(hasRole(session("seo_content"), ["subadmin", "seo_content"])).toBe(true);
            // …but NOT lists that don't include seo_content.
            expect(hasRole(session("seo_content"), ["subadmin"])).toBe(false);
            expect(hasRole(session("seo_content"), ["superadmin"])).toBe(false);
        });

        it("returns false when allowed is empty", () => {
            expect(hasRole(session("superadmin"), [])).toBe(false);
        });

        it("returns false when the session has no recognised role", () => {
            expect(hasRole({ role: "unknown" as any, sub: "x", email: "a@a", purpose: "admin" }, ["superadmin"])).toBe(
                false,
            );
        });
    });

    describe("isSuperAdmin / isSubAdmin / isSeoContent", () => {
        it("isSuperAdmin matches only superadmin", () => {
            expect(isSuperAdmin(session("superadmin"))).toBe(true);
            expect(isSuperAdmin(session("subadmin"))).toBe(false);
            expect(isSuperAdmin(session("seo_content"))).toBe(false);
        });
        it("isSubAdmin matches superadmin OR subadmin (superadmin includes)", () => {
            expect(isSubAdmin(session("superadmin"))).toBe(true);
            expect(isSubAdmin(session("subadmin"))).toBe(true);
            expect(isSubAdmin(session("seo_content"))).toBe(false);
        });
        it("isSeoContent matches only seo_content (most restrictive)", () => {
            expect(isSeoContent(session("seo_content"))).toBe(true);
            expect(isSeoContent(session("subadmin"))).toBe(false);
            expect(isSeoContent(session("superadmin"))).toBe(false);
        });
    });
});
