import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { defaultAdminEnabled, isProduction } from "@/lib/featureFlags";

const DEFAULT_EMAIL = "admin@brpl.com";
const DEFAULT_PASSWORD = "Admin@123";
const DEFAULT_NAME = "Super Admin";

let seeded = false;

/** Idempotent. Only runs in dev/staging or when ALLOW_DEFAULT_ADMIN=1. */
export async function ensureDefaultAdmin() {
    if (seeded) return;
    if (!defaultAdminEnabled()) {
        seeded = true;
        if (isProduction()) {
            console.warn("[admin-bootstrap] Skipped default admin (production).");
        }
        return;
    }
    try {
        await connectDB();
        const existing = await AdminUser.findOne({ email: DEFAULT_EMAIL }).lean();
        if (!existing) {
            const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
            await AdminUser.create({
                email: DEFAULT_EMAIL,
                passwordHash,
                name: DEFAULT_NAME,
                role: "superadmin",
                active: true,
                totpEnabled: false,
            });
            if (process.env.NODE_ENV !== "production") {
                console.info(
                    `[admin-bootstrap] Seeded default admin: ${DEFAULT_EMAIL} / ${DEFAULT_PASSWORD}`
                );
            }
        }
        seeded = true;
    } catch (err) {
        console.error("[admin-bootstrap] failed", err);
    }
}
