import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { signJwt, setAdminCookie, verifyJwt } from "@/lib/jwt";
import { ok, fail } from "@/lib/adminApi";
import { verifyTotp } from "@/lib/totp";
import { isProduction } from "@/lib/featureFlags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    otpToken: z.string().min(10),
    code: z.string().regex(/^\d{6}$/),
});

/**
 * Verifies a 6-digit TOTP code against the admin's stored secret.
 * In non-production builds, falls back to "000000" if TOTP isn't configured
 * (useful for the default admin seed).
 */
export async function POST(req: Request) {
    try {
        const json = await req.json().catch(() => ({}));
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
            return fail("Invalid input", 400);
        }

        const payload = await verifyJwt<{
            sub: string;
            email: string;
            role: string;
            name?: string;
            purpose?: string;
        }>(parsed.data.otpToken);
        if (!payload || !payload.sub || (payload.purpose !== "admin" && payload.purpose !== "admin_otp")) {
            return fail("Session expired. Please log in again.", 401);
        }

        await connectDB();
        const admin = await AdminUser.findById(payload.sub);
        if (!admin || !admin.active) {
            return fail("Invalid session", 401);
        }

        let accepted = false;
        if (admin.totpEnabled && admin.totpSecret) {
            accepted = verifyTotp(admin.totpSecret, parsed.data.code);
        } else if (!isProduction()) {
            // Dev convenience: accept "000000" when TOTP isn't configured
            accepted = parsed.data.code === "000000";
        }

        if (!accepted) {
            return fail("Invalid OTP", 400);
        }

        const token = await signJwt({
            sub: admin._id.toString(),
            email: admin.email,
            role: admin.role,
            name: admin.name,
            purpose: "admin",
        });
        await setAdminCookie(token);

        return ok({ token, email: admin.email, name: admin.name, role: admin.role });
    } catch (err: any) {
        console.error("[admin/verify-otp]", err);
        return fail(err?.message || "Internal error", 500);
    }
}
