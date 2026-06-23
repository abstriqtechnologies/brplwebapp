import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";

const DEFAULT_EMAIL = "admin@brpl.com";
const DEFAULT_PASSWORD = "Admin@123";
const DEFAULT_NAME = "Super Admin";

let seeded = false;

/**
 * Ensures the default super-admin user exists. Idempotent — only runs once
 * per process. Called at the top of admin auth handlers.
 */
export async function ensureDefaultAdmin() {
    if (seeded) return;
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
            // Log once per server lifetime so the dev knows the credentials.
            console.info(
                `[admin-bootstrap] Seeded default admin: ${DEFAULT_EMAIL} / ${DEFAULT_PASSWORD}`
            );
        }
        seeded = true;
    } catch (err) {
        console.error("[admin-bootstrap] failed", err);
    }
}
