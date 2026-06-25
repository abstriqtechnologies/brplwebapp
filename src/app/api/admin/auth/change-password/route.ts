import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { requireAdmin, ok, fail, serverError } from "@/lib/adminApi";
import { validatePassword } from "@/lib/password-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
    try {
        const session = await requireAdmin();
        if (session instanceof Response) return session;
        const json = await req.json().catch(() => ({}));
        const parsed = schema.safeParse(json);
        if (!parsed.success) return fail("Invalid input", 400);

        // Phase 1: enforce the full password policy on top of the schema's
        // length bound.
        const policyError = validatePassword(parsed.data.newPassword);
        if (policyError) return fail(policyError, 400);

        await connectDB();
        const admin = await AdminUser.findById(session.session.sub);
        if (!admin) return fail("Admin not found", 404);

        const okPwd = await bcrypt.compare(parsed.data.oldPassword, admin.passwordHash);
        if (!okPwd) return fail("Current password is incorrect", 401);

        admin.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
        await admin.save();

        return ok({ success: true });
    } catch (err) {
        return serverError(err);
    }
}
