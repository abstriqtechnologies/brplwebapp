/**
 * Admin bootstrap — ensure the seeded superadmin exists before the first
 * admin login attempt in a fresh environment.
 *
 * Simplified for the SMS-OTP flow:
 *   - Always runs (no ALLOW_DEFAULT_ADMIN gate).
 *   - No password seeding — the new login flow doesn't take a password.
 *   - The seeded admin's `phone` is stamped from the ADMIN_PHONES allowlist
 *     so the SMS-OTP verify step can find it. Legacy admins (already in
 *     the DB without a phone) are patched in place on first run.
 *   - Idempotent via a module-level `seeded` flag.
 *
 * Invoked from `/api/admin/auth/send-otp` so the seeded admin always
 * exists before the first OTP is generated in a fresh environment.
 */

import "server-only";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { getAdminAllowedPhones } from "@/lib/domain/admin-auth/service";

const DEFAULT_EMAIL = "admin@Brpl.com";
const DEFAULT_NAME = "Super Admin";

let seeded = false;

/**
 * Idempotent. Safe to call from every admin route handler — the work
 * happens at most once per process.
 */
export async function ensureDefaultAdmin(): Promise<void> {
    if (seeded) return;

    try {
        await connectDB();
        const phone = getAdminAllowedPhones()[0];
        const existing = await AdminUser.findOne({ email: DEFAULT_EMAIL });

        if (!existing) {
            await AdminUser.create({
                email: DEFAULT_EMAIL,
                // The schema still requires a passwordHash; the OTP flow
                // never reads it. A random opaque hash keeps it from being
                // usable for legacy password login.
                passwordHash: `unused-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
                name: DEFAULT_NAME,
                role: "superadmin",
                active: true,
                phone,
                totpEnabled: false,
            });
        } else if (!existing.phone) {
            // Legacy admin created before the OTP flow — stamp the phone so
            // the verify step can find them.
            existing.phone = phone;
            await existing.save();
        }

        seeded = true;
    } catch (err) {
        // Don't crash the request — log and try again on the next call.
        // eslint-disable-next-line no-console
        console.error("[admin-bootstrap] failed", err);
    }
}