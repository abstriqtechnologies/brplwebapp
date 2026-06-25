/**
 * `/api/admin/me` — get or update the current admin's profile.
 *
 * Phase 2.8 (proof of concept): migrated to the new `withRequest + withAdmin`
 * composition. Errors are caught by `withRequest` and shaped into the
 * standard `{ ok, code, message, requestId }` envelope. The success shape
 * is unchanged.
 */

import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { signAdmin } from "@/lib/auth/crypto";
import { setAdminCookie } from "@/lib/auth/cookies";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
    name: z.string().min(1).max(120).optional(),
});

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
    })(async ({ admin }) => {
        return ok({
            email: admin.email,
            name: admin.name,
            role: admin.role,
            sub: String(admin._id),
        });
    }),
);

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
    })(async ({ admin, req }) => {
        const json = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(json);
        if (!parsed.success) throw new BadRequestError("Invalid input");
        await connectDB();
        const updated = await AdminUser.findByIdAndUpdate(String(admin._id), parsed.data, {
            new: true,
        }).lean();
        if (!updated) throw new NotFoundError("Admin not found");

        // Re-issue the cookie so the JWT reflects the new name.
        const token = await signAdmin({
            sub: String(updated._id),
            email: updated.email,
            name: updated.name,
            role: updated.role as "superadmin" | "subadmin" | "seo_content",
        });
        await setAdminCookie(token);
        return ok({
            email: updated.email,
            name: updated.name,
            role: updated.role,
        });
    }),
);
