import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { requireAdmin, ok, fail, serverError } from "@/lib/adminApi";
import { signJwt, setAdminCookie } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const session = await requireAdmin();
    if (session instanceof Response) return session;
    return ok({
        email: session.email,
        name: session.name,
        role: session.role,
        sub: session.sub,
    });
}

const patchSchema = z.object({
    name: z.string().min(1).max(120).optional(),
});

export async function PATCH(req: Request) {
    try {
        const session = await requireAdmin();
        if (session instanceof Response) return session;
        const json = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(json);
        if (!parsed.success) return fail("Invalid input", 400);
        await connectDB();
        const admin = await AdminUser.findByIdAndUpdate(
            session.sub,
            parsed.data,
            { new: true }
        ).lean();
        if (!admin) return fail("Admin not found", 404);
        // Re-issue cookie with the new name so the session reflects the change.
        const token = await signJwt({
            sub: admin._id.toString(),
            email: admin.email,
            name: admin.name,
            role: admin.role,
            purpose: "admin",
        });
        await setAdminCookie(token);
        return ok({
            email: admin.email,
            name: admin.name,
            role: admin.role,
        });
    } catch (err) {
        return serverError(err);
    }
}
