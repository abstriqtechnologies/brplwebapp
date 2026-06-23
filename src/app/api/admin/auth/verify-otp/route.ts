import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { signJwt, setAdminCookie, verifyJwt } from "@/lib/jwt";
import { ok, fail } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    otpToken: z.string().min(10),
    code: z.string().regex(/^\d{6}$/),
});

/**
 * Dev-mode TOTP verification: accepts "000000" if TOTP is disabled.
 * If TOTP is enabled, we still accept any 6-digit number (the production
 * swap point is here — wire a `speakeasy.totp.verify(...)` call).
 */
export async function POST(req: Request) {
    try {
        const json = await req.json().catch(() => ({}));
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
            return fail("Invalid input", 400);
        }

        const payload = await verifyJwt<{ sub: string; email: string; role: string; name?: string }>(
            parsed.data.otpToken
        );
        if (!payload || !payload.sub) {
            return fail("Session expired. Please log in again.", 401);
        }

        await connectDB();
        const admin = await AdminUser.findById(payload.sub);
        if (!admin || !admin.active) {
            return fail("Invalid session", 401);
        }

        // Dev verification — replace with real TOTP check in production.
        const accepted =
            parsed.data.code.length === 6 && /^\d{6}$/.test(parsed.data.code);
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
