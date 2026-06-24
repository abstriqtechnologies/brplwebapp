import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { signJwt, setAdminCookie } from "@/lib/jwt";
import { ensureDefaultAdmin } from "@/lib/adminBootstrap";
import { ok, fail } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    email: z.string().email().max(160),
    password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
    try {
        const json = await req.json().catch(() => ({}));
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
            return fail(parsed.error.issues[0]?.message || "Invalid input", 400);
        }

        await ensureDefaultAdmin();
        await connectDB();

        const email = parsed.data.email.toLowerCase().trim();
        const admin = await AdminUser.findOne({ email });
        if (!admin || !admin.active) {
            return fail("Invalid credentials", 401);
        }

        const matches = await bcrypt.compare(parsed.data.password, admin.passwordHash);
        if (!matches) {
            return fail("Invalid credentials", 401);
        }

        // If TOTP enabled, issue a short-lived "admin_otp" token first.
        if (admin.totpEnabled && admin.totpSecret) {
            const otpToken = await signJwt(
                {
                    sub: admin._id.toString(),
                    email: admin.email,
                    role: admin.role,
                    name: admin.name,
                    purpose: "admin_otp",
                },
                "5m"
            );
            return ok({
                requireOtp: true,
                otpToken,
                message: "Enter the 6-digit code from your authenticator app",
            });
        }

        const token = await signJwt({
            sub: admin._id.toString(),
            email: admin.email,
            role: admin.role,
            name: admin.name,
            purpose: "admin",
        });
        await setAdminCookie(token);

        return ok({
            token,
            email: admin.email,
            name: admin.name,
            role: admin.role,
        });
    } catch (err: any) {
        console.error("[admin/login]", err);
        return fail(err?.message || "Internal error", 500);
    }
}
