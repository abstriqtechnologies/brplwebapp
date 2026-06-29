/**
 * `/api/admin/settings/seo` — read/write global site script injections.
 *
 *   GET   /api/admin/settings/seo  → { customHeadScripts, customBodyScripts }
 *   PATCH /api/admin/settings/seo  → update both fields → revalidate cache
 *
 * Auth: superadmin.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import SiteSettings from "@/models/SiteSettings";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import { revalidateSite, TAGS } from "@/lib/revalidate";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

const patchSchema = z.object({
    customHeadScripts: z.string().optional(),
    customBodyScripts: z.string().optional(),
});

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async () => {
        await connectDB();
        const settings = await SiteSettings.findOne({}).lean();
        return ok({
            customHeadScripts: (settings as any)?.customHeadScripts ?? "",
            customBodyScripts: (settings as any)?.customBodyScripts ?? "",
        });
    }),
);

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        const body = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", {
                details: parsed.error.issues,
            });
        }
        const { customHeadScripts, customBodyScripts } = parsed.data;

        await connectDB();
        const update: Record<string, string> = {};
        if (customHeadScripts !== undefined) update.customHeadScripts = customHeadScripts;
        if (customBodyScripts !== undefined) update.customBodyScripts = customBodyScripts;

        if (Object.keys(update).length === 0) {
            throw new BadRequestError("No fields to update");
        }

        await SiteSettings.findOneAndUpdate({}, { $set: update }, { upsert: true });

        revalidateSite(TAGS.SETTINGS);

        return ok({ saved: true });
    }),
);
